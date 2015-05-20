var util = require('util');

// TODO check for mongoose being passed?
module.exports = function(mongoose){

  // TODO use document provider for browser (https://github.com/Automattic/mongoose/issues/2996)
  var Document = mongoose.Document;
  var Promise = mongoose.Promise;

  function EmbeddedDictionary(obj, parentDictionary, skipId, fields, key){
    // TODO check for right intance
    if(!parentDictionary) return new Error('An embedded document must be passed a parent dictionary.');

    this.__parentDictionary = parentDictionary;
    // The top level document that contains the dictionary
    // TODO it works?
    this.__parent = parentDictionary._parent;

    // The key on the dictionary where this document it's stored
    this.__key = key;

    // TODO 3rd is `fields`, what to pass, it's used when retrieving just some field, right?
    Document.call(this, obj, fields, skipId);

    // TODO taken from EmbeddedDocument, useful?
    var self = this;
    this.on('isNew', function (val) {
      self.isNew = val;
    });
  };

  /**
   * Marks the embedded doc modified.
   *
   * ####Example:
   *
   *     var doc = blogpost.comments.id(hexstring);
   *     doc.mixed.type = 'changed';
   *     doc.markModified('mixed.type');
   *
   * @param {String} path the path which changed
   * @api public
   * @receiver EmbeddedDictionary
   */

  EmbeddedDictionary.prototype.markModified = function(path){
    this.$__.activePaths.modify(path);
    if (this.isNew) {
      // Mark the WHOLE parent array as modified
      // if this is a new document (i.e., we are initializing
      // a document),
      // TODO necessary?
      this.__parentDictionary._markModified();
    } else {
      this.__parentDictionary._markModified(this.__key, path);
    }
  };

  /**
   * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
   *
   * ####NOTE:
   *
   * _This is a no-op. Does not actually save the doc to the db._
   *
   * @param {Function} [fn]
   * @return {Promise} resolved Promise
   * @api private
   */
  //TODO necessary?
  EmbeddedDictionary.prototype.save = function(fn){
    var promise = new Promise(fn);
    promise.fulfill();
    return promise;
  }

  /**
   * Removes the subdocument from its parent array.
   *
   * @param {Function} [fn]
   * @api public
   */
   // TODO can remove? we should use this code for listeners
  EmbeddedDictionary.prototype.remove = function(fn){
    var _id;
    if(!this.willRemove){
      _id = this._doc._id;
      if(!_id){
        throw new Error('For your own good, Mongoose does not know ' +
                        'how to remove an EmbeddedDictionary that has no _id');
      }
      this.__parentDictionary.remove(this.__key);
      this.willRemove = true;
      registerRemoveListener(this);
    }

    if(fn) fn(null);

    return this;
  };

  /*!
   * Registers remove event listeners for triggering
   * on subdocuments.
   *
   * @param {EmbeddedDictionary} sub
   * @api private
   */

  function registerRemoveListener(sub){
    var owner = sub.ownerDocument();

    owner.on('save', emitRemove);
    owner.on('remove', emitRemove);

    function emitRemove(){
      owner.removeListener('save', emitRemove);
      owner.removeListener('remove', emitRemove);
      sub.emit('remove', sub);
      owner = sub = emitRemove = null;
    };
  };

  /**
   * Override #update method of parent documents.
   * @api private
   */

  EmbeddedDictionary.prototype.update = function(){
    throw new Error('The #update method is not available on EmbeddedDictionary');
  }

  /**
   * Helper for console.log
   *
   * @api public
   */

  EmbeddedDictionary.prototype.inspect = function(){
    return util.inspect(this.toObject());
  };

  /**
   * Marks a path as invalid, causing validation to fail.
   *
   * @param {String} path the field to invalidate
   * @param {String|Error} err error which states the reason `path` was invalid
   * @return {Boolean}
   * @api public
   */
   // TODO needs implementation
  EmbeddedDictionary.prototype.invalidate = function(path, err, val, first){
    var key = this.__key;
    if(typeof key !== 'undefined'){
      var parentPath = this.__parentDictionary._path;
      var fullPath = [parentPath, key, path].join('.');
      this.__parent.invalidate(fullPath, err, val);
    }

    if(first){
      this.$__.validationError = this.ownerDocument().$__.validationError;
    }

    return true;
  };

  /**
   * Marks a path as valid, removing existing validation errors.
   *
   * @param {String} path the field to mark as valid
   * @api private
   * @method $markValid
   * @receiver EmbeddedDictionary
   */
   // TODO just copied, needs implementation
  EmbeddedDictionary.prototype.$markValid = function(path){
    var key = this.__key;
    if(typeof key !== 'undefined'){
      var parentPath = this.__parentDictionary._path;
      var fullPath = [parentPath, key, path].join('.');
      this.__parent.$markValid(fullPath);
    }
  };

  /**
   * Checks if a path is invalid
   *
   * @param {String} path the field to check
   * @api private
   * @method $isValid
   * @receiver EmbeddedDictionary
   */
   //TODO miss implementation, copied as it was
  EmbeddedDictionary.prototype.$isValid = function(path){
    var key = this.__key;
    if(typeof key !== 'undefined'){
      var parentPath = this.__parentDictionary._path;
      var fullPath = [parentPath, key, path].join('.');
      return !this.__parent.$__.validationError ||
        !this.__parent.$__.validationError.errors[path];
    }

    return true;
  };

  /**
   * Returns the top level document of this sub-document.
   *
   * @return {Document}
   */
   //TODO necessary?
  EmbeddedDictionary.prototype.ownerDocument = function(){
    if(this.$__.ownerDocument){
      return this.$__.ownerDocument;
    }

    var parent = this.__parent;
    if (!parent) return this;

    while(parent.__parent){
      parent = parent.__parent;
    }

    return this.$__.ownerDocument = parent;
  }

  /**
   * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
   *
   * @param {String} [path]
   * @return {String}
   * @api private
   * @method $__fullPath
   * @memberOf EmbeddedDictionary
   */
   //TODO necessary?
  EmbeddedDictionary.prototype.$__fullPath = function(path){
    if(!this.$__.fullPath){
      var parent = this;
      if (!parent.__parent) return path;

      var paths = [];
      while(parent.__parent){
        paths.unshift(parent.__parentDictionary._path);
        parent = parent.__parent;
      }

      this.$__.fullPath = paths.join('.');

      if(!this.$__.ownerDocument){
        // optimization
        this.$__.ownerDocument = parent;
      }
    }

    return path
      ? this.$__.fullPath + '.' + path
      : this.$__.fullPath;
  }

  /**
   * Returns this sub-documents parent document.
   *
   * @api public
   */
   //TODO necessary?
  EmbeddedDictionary.prototype.parent = function(){
    return this.__parent;
  }

  /**
   * Returns this sub-documents parent array.
   *
   * @api public
   */
   //TODO necessary?
  EmbeddedDictionary.prototype.parentDictionary = function(){
    return this.__parentDictionary;
  }

  EmbeddedDictionary.prototype = Object.create(Document.prototype);
  EmbeddedDictionary.prototype.constructor = EmbeddedDictionary;

  return EmbeddedDictionary;

};