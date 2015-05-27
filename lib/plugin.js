// Plugin version of the dictionary

// TODO allow dictionary on subfield
// TODO avoid keys to appear mutliple times inside doc.modifiedPaths();
// TODO allow key-values fields

// Defined later
var mongoose;

// Keys of dictionary's internals
// Must not be saved to the db
var internalKeys = ['$add', '$remove', 'valueOf', '_dictionaryField', '_parent', '_dictionaryModel'];

// The ditionary type
var DictionaryType = function(parent, dictionaryField, dictionaryModel){
  // Holds a reference to the parent doc
  this._parent = parent;

  // Remember the key on the parent where it's stored
  this._dictionaryField = dictionaryField;

  // Holds a reference to the model class used for subdocs
  this._dictionaryModel = dictionaryModel;

  // TODO error if params missing
};

// Add a subdoc to the dictionary, accepts a key and initial values
DictionaryType.prototype.$add = function (key, obj) {
  // Throw an error id the key is already defined
  if (this[key]) {
    throw new Error('Key "' + key + '" already defined on the dictionary.');
  }

  // Create subdoc
  var subDoc = new this._dictionaryModel(obj);

  // Mark the path on the dictionary as modified
  this._parent.markModified(this._dictionaryField + '.' + key);

  // Add the new subdoc to the dictionary
  this[key] = subDoc;
};

DictionaryType.prototype.$remove = function (key) {
  // Throw an error id the key is not defined
  if(!this[key]){
    throw new Error('Key "' + key + '" not defined on the dictionary.');
  }

  // Remove the subdoc from the dictionary and mark its path as modifed
  // TODO remove listeners? destroy doc? Possible memory leaks
  // TODO use delete keyword?
  this[key] = undefined;
  this._parent.markModified(this._dictionaryField + '.' + key);
};

// Method called when serializing the parent doc
//
// It looks like that if an object has a constructor then
// mongoose's `toObject` will call `obj.valueOf`
// Very very hacky but it's this or forking mongoose
// Because we absolutely need to override the normal serialization
// that would save internals keys in the database
// TODO find better solution
DictionaryType.prototype.valueOf = function () {
  var normalized = {};

  for (var key in this){
    if (internalKeys.indexOf(key) === -1 && this[key]) {
      normalized[key] = this[key].toObject();
    }
  }

  return normalized;
};

function dictionaryPlugin (schema, options) {

  // TODO throw error?
  if (!options || !options.fields) return;

  // The fields where the dictionary will be set up
  // Can be more than one, the keys in `optiosn.fields` are the fields' names
  var fields = options.fields;

  // Iterate over the fields and set up the dictionaries
  for (var field in fields) {

    // Create a model that will be used to cast values & do validation
    // on the sub documents of the dictionary
    var dictionaryModel = mongoose.model(
      field + 'DictionaryModel', 
      new mongoose.Schema(fields[field], {
        _id: false,
        id: false
      })
    );

    // TODO Not nice but need to use value of field as property name
    var addToSchema = {};
    addToSchema[field] = {
      // Define the ditionary field as a Mixed type
      type: mongoose.Schema.Types.Mixed,
    }

    schema.add(addToSchema);

    // `this` refers to the document where the dictionary is defined
    // TODO we have to call `next` here?
    var initDoc = function () {

      // Create a new dictionary type
      // Pass `this` to hold a reference to the parent
      // Also pass the key where the dictionary is defined
      var dictionaryObj = new DictionaryType(this, field, dictionaryModel);

      // For each key (not internal) already defined on the document
      // convert its value to a dictionaryModel 
      for (var key in this[field]){
        if (internalKeys.indexOf(key) === -1) {
          dictionaryObj[key] = new dictionaryModel(this[field][key]);
        }
      }

      // If the field wasn't defined (new doc or from db without the dictionary)
      // mark it as modified
      // TODO necessary?
      if (!this[field]) {
        this.markModified(field);
      }

      // Use the dictionary type as the field value
      this[field] = dictionaryObj;

    };

    // Set up the dictionary when the doc is returned from db or created
    // `new` must be called manually when the document is created locally
    // with `doc.emit('new');`
    schema
      .post('new', initDoc)
      .post('init', initDoc);

    // TODO async validators
    // TODO support complete removal of dictionary
    schema.pre('save', function (next) {

      // TODO we can't do this way
      // because if this[field] is undefined then it's cloned
      // not referenced in `var dictionary`
      // Maybe here can be avoided since we're sure it's avalaible?
      // `var dictionary = this[field];`

      for (var key in this[field]) {
        // Check that the key is not an internal...
        if (internalKeys.indexOf(key) === -1 && 
            // That it's not undefined (like when removed)...
            this[field][key] && 
            // That the subdoc is new (just added) or has been modified...
            (this[field][key].isModified() || this[field][key].isNew)) {

          // Run validations on the subdoc
          // TODO async validations too
          var err = this[field][key].validateSync();
          if (err) return next(err);

          // TODO mark modified only the keys modified on the subdoc
          this.markModified(field + '.' + key);
        }
      }

      return next();

    });
  }

};


module.exports = function(mongooseInstance){
  // Set mongoose to the right instance when module is required
  mongoose = mongooseInstance;

  return dictionaryPlugin;
};