var util = require('util');

// TODO we need to pass mongoose here?
module.exports = function(mongoose){

  function TypeDictionary(value, subDocument, doc, path){
    this._subDocument = subDocument;
    this._parent = doc;
    this._path = path;

    // TODO doc is avalaible only after some time (setInterval logs it at the first time)
    value = value || {};

    // TODO is this correct?
    if(Object.prototype.toString.call(value) !== '[object Object]'){
      //throw new Error('Only a plain objects is supported as dictionaries initial value.');
    }

    return this._cast(value);
  };

  TypeDictionary.prototype._cast = function(value){
    this._docsKeys = {};
    // TODO remove previous values, if any?

    for(var key in value){
      console.log(key)
      // TODO does this set every key as modified?
      var subDoc = new this._subDocument(values[key], this, true, true, key);
      //subDoc.init(values[key]);
      // Doesn't executed past init, I'm going mad
      this[key] = subDoc;
      this._docsKeys[key] = true;
    }

    return this;
  };

  TypeDictionary.prototype._markModified = function(key, embeddedPath){
    console.log('marking modified',arguments)
    var parent = this._parent
      , dirtyPath;

    if (parent) {
      dirtyPath = this._path;

      if (arguments.length) {
        if (null != embeddedPath) {
          // an embedded doc bubbled up the change
          dirtyPath = dirtyPath + '.' + key + '.' + embeddedPath;
        } else {
          // directly set an index
          dirtyPath = dirtyPath + '.' + key;
        }
      }
      parent.markModified(dirtyPath);
    }

    return this;
  };

  TypeDictionary.prototype.$add = function(key, obj){
    if(this._docsKeys[key]){
      throw new Error('Key "' + key + '" already defined on the dictionary.');
    }

    var subDoc = new this._subDocument(obj, this, true, null, key);
    // TODO invalid object is accepted?
    // TODO markModified is called automatically? NO
    this._markModified(key);
    //subDoc.init(obj);
    this[key] = subDoc;
    this._docsKeys[key] = true;
  };

  TypeDictionary.prototype.$remove = function(key){
    if(!this._docsKeys[key]){
      throw new Error('Key "' + key + '" not defined on the dictionary.');
    }

    // TODO remove listeners? destroy doc? delete keyword? MARK MODIFIED
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