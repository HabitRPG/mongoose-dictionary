# Mongoose Dictionary Plugin

## How to use

```javascript
npm install --save mongoose HabitRPG/mongoose-dictionary
```

```javascript
var mongoose = require('mongoose');
var dictionaryPlugin = require('mongoose-dictionary')(mongoose);

mongoose.connect('mongodb://localhost/dictionary_testing');

var MySchema = new mongoose.Schema({
  title: String,
});

MySchema.plugin(dictionaryPlugin, {
  fields: {
    nameOfTheDictionaryField: {
      field1OfDictionary: String
    }
  }
});

var MyModel = mongoose.model('MyModel', MySchema);

var doc = new MyModel({
  title: 'a'
});

// IMPORTANT THIS MUST BE CALLED WHEN CREATING A NEW DOCUMENT LOCALLY (NOT RETURNED FROM DB)
doc.emit('new', doc);


doc.dictionary.$add('key', {
  field1: 123 // Using a number to show that casting is working
});


doc.save(function(err, doc){
  console.log(err, doc)
});
```