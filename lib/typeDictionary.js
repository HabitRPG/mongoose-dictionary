var util = require('util');

// TODO we need to pass mongoose here?
// TODO check for mongoose being passed?
module.exports = function(mongoose){

  function TypeDictionary(value, subDocument, doc, path, init){
    this._subDocument = subDocument;
    this._parent = doc;
    this._path = path;

    value = value || {};

    // TODO is this correct?
    if(Object.prototype.toString.call(value) !== '[object Object]'){
      throw new Error('Only a plain objects is supported as dictionaries initial value.');
    }

    // TODO necessary to return `this`?
    return this._cast(value, init);
  };

  TypeDictionary.prototype._cast = function(value, init){
    this._docsKeys = {};
    // TODO remove previous values, if any?

    for(var key in value){
      // TODO does this set every key as modified?
      // TODO what about subDoc.init? should be called? 
      // init: see https://github.com/Automattic/mongoose/blob/master/lib/schema/documentarray.js#L189
      var subDoc;
      if(init){
        subDoc = new this._subDocument(null, this, true, null, key);
        subDoc = subDoc.init(value[key]);
      }else{
        subDoc = new this._subDocument(value[key], this, true, null, key);
      }

      this[key] = subDoc;
      this._docsKeys[key] = true;
    }

    return this;
  };

  TypeDictionary.prototype._markModified = function(key, embeddedPath){
    var parent = this._parent;
    var dirtyPath;

    // TODO we always have this._parent, right?
    if(parent){
      dirtyPath = this._path;

      if(arguments.length){
        if(null != embeddedPath){
          // an embedded doc bubbled up the change
          dirtyPath = dirtyPath + '.' + key + '.' + embeddedPath;
        }else{
          // directly set an index
          dirtyPath = dirtyPath + '.' + key;
        }
      }

      parent.markModified(dirtyPath);
    }

    // TODO useful?
    return this;
  };

  TypeDictionary.prototype.$add = function(key, obj){
    if(this._docsKeys[key]){
      throw new Error('Key "' + key + '" already defined on the dictionary.');
    }

    // TODO invalid object is accepted?
    // TODO subDoc.init() should be called?
    var subDoc = new this._subDocument(obj, this, true, null, key);

    this._markModified(key);

    this[key] = subDoc;
    this._docsKeys[key] = true;
  };

  TypeDictionary.prototype.$remove = function(key){
    if(!this._docsKeys[key]){
      throw new Error('Key "' + key + '" not defined on the dictionary.');
    }

    // TODO remove listeners? destroy doc? POSSIBLE MEMORY LEAKS
    // TODO use delete keyword?
    this._docsKeys[key] = undefined;
    this._markModified(key);
    this[key] = undefined;
  };

  TypeDictionary.prototype.toObject = function(){
    var obj = {};

    for(var key in this._docsKeys){
      // TODO account for removed subdocs, correct?
      if(this._docsKeys[key]){
        obj[key] = this[key].toObject();
      }
    }

    return obj;
  };

  TypeDictionary.prototype.toString =
  TypeDictionary.prototype.inspect = function(){
    return util.inspect(this.toObject());
  };

  return TypeDictionary;

};