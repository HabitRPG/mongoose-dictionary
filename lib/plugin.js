// Plugin version of the dictionary

// TODO allow dictionary on subfield
// TODO avoid keys to appear mutliple times inside doc.modifiedPaths();
// TODO allow key-values fields

// Defined later
var mongoose;

// Keys of dictionary's internals
// Must not be saved to the db
var internalKeys = ['$add', '$remove', 'valueOf',
                    '_dictionaryField', '_parentPath', '_owner',
                    '_dictionaryModel', '_nestedDictionaries'];

// The ditionary type
var DictionaryType = function(owner, parentPath, dictionaryField, dictionaryModel, nestedDictionaries){
  // Holds a reference to the owner document
  this._owner = owner;

  // The path of the parent document inside the owner
  // '' unless this is a nested dictionary
  this._parentPath = parentPath;

  // Remember the key on the parent where it's stored
  this._dictionaryField = dictionaryField;

  // Holds a reference to the model class used for subdocs
  this._dictionaryModel = dictionaryModel;

  this._nestedDictionaries = nestedDictionaries;

  // TODO error if params missing
};

// Add a subdoc to the dictionary, accepts a key and initial values
// if `init === true` then doesn't mark the doc as modified,
// for example when the doc is retrieved from the db and not edited
DictionaryType.prototype.$add = function (key, obj, init) {
  // Throw an error id the key is already defined
  if (this[key]) {
    throw new Error('Key "' + key + '" already defined on the dictionary.');
  }

  // Create subdoc
  var subDoc = new this._dictionaryModel(obj);

  // If there are nested dictionaries, set them up...
  for (var nested in this._nestedDictionaries){
    subDoc[nested] = new DictionaryType(
      this._owner,
      this._dictionaryField,
      nested, 
      mongoose.model(nested + 'NestedDictionaryModel', new mongoose.Schema(this._nestedDictionaries[nested], {
        _id: false, id: false
      })),
      {}
    );

    // ... with initial values
    if(obj[nested]){
      for (nestedItems in obj[nested]) {
        subDoc[nested].$add(nestedItems, obj[nested][nestedItems], init)
      }
    }
  }

  // Mark the path on the dictionary as modified
  // if it's not being initialized
  if(!init){
    var path = this._dictionaryField + '.' + key;
    path = this._parentPath !== '' ? (this._parentPath + '.' + path) : path;
    this._owner.markModified(path);
  }

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

  var path = this._dictionaryField + '.' + key;
  path = this._parentPath !== '' ? (this._parentPath + '.' + path) : path;
  this._owner.markModified(path);
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
      // For normal keys use `toObject`, 
      // `valueOf` for nested dictionaries
      if(this._nestedDictionaries[key]){
        normalized[key] = this[key].valueOf()
      }else{
        normalized[key] = this[key].toObject();
      }
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
    var dictionarySchema = fields[field];
    var nestedDictionaries = {};

    // If there are nested dictionaries, use them
    for (var key in dictionarySchema){
      if (dictionarySchema[key] && dictionarySchema[key].type === 'Dictionary') {
        // TODO clone? delete is bad?
        nestedDictionaries[key] = dictionarySchema[key].schema
        // TODO we delete it here and recreate them to avoid referencing it
        delete dictionarySchema[key];

        // So it's treated as a 'Mixed' type and can be used for the dictionary
        dictionarySchema[key] = {};
      }
    }

    dictionarySchema = new mongoose.Schema(dictionarySchema, {
      _id: false,
      id: false
    });

    var dictionaryModel = mongoose.model(
      field + 'DictionaryModel', 
      dictionarySchema
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
      var dictionaryObj = new DictionaryType(this, '', field, dictionaryModel, nestedDictionaries);

      // For each key (not internal) already defined on the document
      // convert its value to a dictionaryModel 
      for (var key in this[field]){
        if (internalKeys.indexOf(key) === -1) {
          dictionaryObj.$add(key, this[field][key], true);
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

      var self = this;

      // TODO we can't do this way
      // because if this[field] is undefined then it's cloned
      // not referenced in `var dictionary`
      // Maybe here can be avoided since we're sure it's avalaible?
      // `var dictionary = this[field];`

      var runValidation = function (dictionaryToValidate) {
        for (var key in dictionaryToValidate) {
          // Check that the key is not an internal...
          if (internalKeys.indexOf(key) === -1 && 
              // That it's not undefined (like when removed)...
              dictionaryToValidate[key] && 
              // That the subdoc is new (just added) or has been modified...
              (dictionaryToValidate[key].isModified() || dictionaryToValidate[key].isNew)) {

            // Run validations on the subdoc
            // TODO async validations too
            for (var nested in dictionaryToValidate._nestedDictionaries) {
              var r = runValidation(dictionaryToValidate[key][nested]);
              if (r) return r;
            }

            // TODO already marked as modified on $add,
            // this is just for fields edited after, better way?
            // TODO mark modified only the keys modified on the subdoc
            var path = dictionaryToValidate._dictionaryField + '.' + key;
            path = dictionaryToValidate._parentPath !== '' ? (dictionaryToValidate._parentPath + '.' + path) : path;
            self.markModified(path);

            var err = dictionaryToValidate[key].validateSync();
            return err;            
          }
        }
      };

      return next(runValidation(this[field]));

    });
  }

};


module.exports = function(mongooseInstance){
  // Set mongoose to the right instance when module is required
  mongoose = mongooseInstance;

  return dictionaryPlugin;
};