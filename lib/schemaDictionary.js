// TODO check for mongoose being passed?
module.exports = function(mongoose){

  // TODO naming?
  var TypeDictionary = require('./typeDictionary')(mongoose);
  var EmbeddedDictionary = require('./embeddedDictionary')(mongoose);

  function SchemaDictionary(path, options){
    if(
      !options || 
      !options.schema || 
      // TODO Do not support object with no schemas (mixed)
      !Object.keys(options.schema).length
    ) throw new TypeError('A schema (no empty object) must be supplied to a dictionary.');

    mongoose.SchemaType.call(this, path, options, 'Dictionary');

    // TODO support key-value dictionaries
    this.schema = new mongoose.Schema(options.schema);

    function SubDocument(){
      EmbeddedDictionary.apply(this, arguments);
    }

    SubDocument.prototype = Object.create(EmbeddedDictionary.prototype);
    SubDocument.prototype.$__setSchema(this.schema);
    SubDocument.schema = this.schema;

    // apply methods
    for (var i in this.schema.methods)
      SubDocument.prototype[i] = this.schema.methods[i];

    // apply statics
    for (var i in this.schema.statics)
      SubDocument[i] = this.schema.statics[i];

    SubDocument.options = options;

    this.subDocument = SubDocument;

    this.default(function(){
      return {};
    });
  };

  SchemaDictionary.schemaName = 'Dictionary';

  SchemaDictionary.prototype = Object.create(mongoose.SchemaType.prototype);
  SchemaDictionary.prototype.constructor = SchemaDictionary;

  SchemaDictionary.prototype.cast = function(value, doc, init, prev){
    if(value instanceof TypeDictionary) return value;

    return new TypeDictionary(value, this.subDocument, doc, this.path, init);
  };

  // TODO validation
  /**
   * Performs local validations first, then validations on each embedded doc
   *
   * @api private
   */
  SchemaDictionary.prototype.doValidate = function(dictionary, fn, scope){
    mongoose.SchemaType.prototype.doValidate.call(this, dictionary, function(err){
      if(err) return fn(err);

      var keys = Object.keys(dictionary._docsKeys);
      var count = keys.length;
      var error;

      if (!count) return fn();

      // TODO what about remove keys which are undefined now?
      // we're using an array because of them ,see original file
      for (var i = 0, len = count; i < len; ++i) {
        // sidestep sparse entries
        var doc = dictionary[keys[i]];

        if(!doc){
          --count || fn(error);
          continue;
        }

        doc.validate(function(err){
          if(err) error = err;
          --count || fn(error);
        });
      }
    }, scope);
  };

  /**
   * Performs local validations first, then validations on each embedded doc.
   *
   * ####Note:
   *
   * This method ignores the asynchronous validators.
   *
   * @return {MongooseError|undefined}
   * @api private
   */

  SchemaDictionary.prototype.doValidateSync = function(dictionary, scope){
    var schemaTypeError = mongoose.SchemaType.prototype.doValidateSync.call(this, dictionary, scope);
    if(schemaTypeError) return schemaTypeError;

    var keys = Object.keys(dictionary._docsKeys);
    var count = keys.length;
    var resultError = null;

    if (!count) return;

    // TODO what about remove keys which are undefined now?
    // we're using an array because of them ,see original file
    for (var i = 0, len = count; i < len; ++i) {
      // only first error
      if (resultError) break;
      // sidestep sparse entries
      var doc = dictionary[keys[i]];
      if (!doc) continue;

      var subdocValidateError = doc.validateSync();

      if(subdocValidateError){
        resultError = subdocValidateError;
      }
    }

    return resultError;
  };


  SchemaDictionary.prototype.castForQuery = function(){
    // TODO miss implementation, used when finding a doc based on dictionary value
  };

  mongoose.Schema.Types.Dictionary = SchemaDictionary;

  return SchemaDictionary;

};