// Exports only the main Dictionary schema, 
// the subdocument shouldn't be accessed indipendently

// TODO remove this file and just set lib/dictionary as main?

// We're not really exporting anything, 
// just need to pass mongoose instance in order to load the type on it
// TODO find a better way
module.exports = function(mongoose){
  if(!mongoose) throw new Error('You must pass an instance of Mongoose to the module.');
  return require('./lib/schemaDictionary')(mongoose);
};