// Plugin version of the dictionary

// TODO allow dictionary on subfield
// TODO avoid keys to appear mutliple times inside doc.modifiedPaths();

// Defined later
var mongoose;

function dictionaryPlugin (schema, options) {

  // TODO throw error?
  if (!options || !options.fields) return;

  var fields = options.fields;

  // Keys of the dictionary for internal use
  // Must not be saved to the db
  var internalKeys = ['$add', '$remove', 'valueOf', '_dictionaryField', '_parent'];

  for (var field in fields) {

    var dictionaryModel = mongoose.model(
      field + 'DictionaryModel', 
      new mongoose.Schema(fields[field], {
        _id: false,
        id: false
      })
    );

    // Not nice but need to use value of field as property name
    var addToSchema = {};
    addToSchema[field] = {
      type: mongoose.Schema.Types.Mixed, // TODO Use custom mixed for toObject?
    }

    schema.add(addToSchema);

    // It seems that if a object has a constructor then
    // toObject will call obj.valueOf
    // Very hacky but it's this or forking mongoose
    // TODO move outside of plugin definition!!
    var DictionaryType = function(parent, dictionaryField){
      this._parent = parent;
      this._dictionaryField = dictionaryField;
      // TODO error if params missing
    };

    DictionaryType.prototype.$add = function (key, obj) {
      if(this[key]){
        throw new Error('Key "' + key + '" already defined on the dictionary.');
      }

      var subDoc = new dictionaryModel(obj);

      // TODO can we do without the parent? just markModified on this (the dictionary) directly?
      this._parent.markModified(this._dictionaryField + '.' + key);

      this[key] = subDoc;
    };

    DictionaryType.prototype.$remove = function (key) {
      if(!this[key]){
        throw new Error('Key "' + key + '" not defined on the dictionary.');
      }

      // TODO remove listeners? destroy doc? POSSIBLE MEMORY LEAKS
      // TODO use delete keyword?
      this._parent.markModified(this._dictionaryField + '.' + key);
      this[key] = undefined;
    };

    DictionaryType.prototype.valueOf = function () {
      var normalized = {};

      for (var key in this){
        if (internalKeys.indexOf(key) === -1 && this[key]) {
          normalized[key] = this[key].toObject();
        }
      }

      return normalized;
    };

    var initDoc = function () {
      // Pass `this` to hold a reference to the parent
      // Also pass the key where the dictionary is defined
      var dictionaryObj = new DictionaryType(this, field);

      for (var key in this[field]){
        if (internalKeys.indexOf(key) === -1) {
          dictionaryObj[key] = new dictionaryModel(this[field][key]);
        }
      }

      if(!this[field]){
        this.markModified(field);
      }

      this[field] = dictionaryObj;

    };

    schema
      .post('new', initDoc)
      .post('init', initDoc);

    // TODO async validators
    // TODO support complete removal of dictionary
    schema.pre('save', function (next) {

      // TODO we can't do this way
      // because if this[field] is undefined then it's cloned
      // not referenced in var dictionary
      // Maybe here can be avoided since we're sure it's avalaible?
      //var dictionary = this[field];

      for (var key in this[field]) {
        if (internalKeys.indexOf(key) === -1 && this[field][key] && this[field][key].isModified()) {
          var err = this[field][key].validateSync();
          if (err) return next(err);

          this.markModified(field + '.' + key);
          return next();
        }
      }
    });
  }

};


module.exports = function(mongooseInstance){
  // Set mongoose to the right instance when module is required
  mongoose = mongooseInstance;

  return dictionaryPlugin;
};