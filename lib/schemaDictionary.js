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
    })
  };

  SchemaDictionary.schemaName = 'Dictionary';

  SchemaDictionary.prototype = Object.create(mongoose.SchemaType.prototype);
  SchemaDictionary.prototype.constructor = SchemaDictionary;

  SchemaDictionary.prototype.cast = function(value, doc, init, prev){
    console.log('Casting dictionary', {
      value: value,
      doc: doc,
      init: init,
      prev: prev
    });

    if(value instanceof TypeDictionary) return value;

    // TODO subdocument should be on prototype or passed to constructor?
    return new TypeDictionary(value, this.subDocument, doc, this.path);
  };

  mongoose.Schema.Types.Dictionary = SchemaDictionary;

  return SchemaDictionary;

};