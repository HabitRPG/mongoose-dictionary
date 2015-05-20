# Mongoose Dictionary Type

## How to use

```javascript
npm install --save mongoose HabitRPG/mongoose-dictionary
```

```javascript
var mongoose = require('mongoose');
var Dictionary = require('mongoose-dictionary')(mongoose);

mongoose.connect('mongodb://localhost/dictionary_testing');

var mySchema = new mongoose.Schema({
  title     : String,
  comments: [Date],
  dictionary: {
    type: Dictionary,
    schema: {
      dictionaryString: {
        type: String,
        default: 'Default value'
      },
      dictionaryNumber: Number
    }
  }
});

var myModel = mongoose.model('myModel', mySchema);
```

### What doesn't work now

```javascript
// Saving an already existing document
myModel.find(function(err, docs){
  docs[0].save(function(err, doc){
    console.log(err, doc);
  });
});

// Error
/*
  /home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:108
    if (this.ended && !this.hasRejectListeners()) throw reason;
                                                        ^
  TypeError: Cannot read property 'errors' of null
      at EventEmitter.<anonymous> (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/index.js:25:43)
      at EventEmitter.<anonymous> (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:175:45)
      at EventEmitter.emit (events.js:110:17)
      at Promise.safeEmit (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:81:21)
      at Promise.fulfill (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:94:24)
      at Promise.resolve (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/lib/promise.js:113:23)
      at model.<anonymous> (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/lib/document.js:1564:39)
      at next_ (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/hooks-fixed/hooks.js:89:34)
      at EventEmitter.fnWrapper (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/hooks-fixed/hooks.js:171:15)
      at EventEmitter.<anonymous> (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:175:45)
      at EventEmitter.emit (events.js:110:17)
      at Promise.safeEmit (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:81:21)
      at Promise.fulfill (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:94:24)
      at p1.then.then.then.then.self.isNew (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/lib/model.js:270:27)
      at newTickHandler (/home/matteo/Dev/habitrpg/mongoose-dictionary/testing/node_modules/mongoose/node_modules/mpromise/lib/promise.js:229:18)
      at process._tickCallback (node.js:355:11)
*/
```
```javascript
// Saving a new document
var myDoc = myModel.create({
  title: 'First doc with dic'
}, function(){
  console.log(arguments);
});

// Error is segmentation fault (core dump)

```

```javascript
// Creating a doc with a value
var myDoc = new myModel({
  title: 'First doc with dic',
  dictionary: {
    key1: {
      dictionaryString: 'whatever'
    }
  }
});

// Error 
// myDoc.dictionary is {} (default value)
// removing the handler for the default value break everything

```

