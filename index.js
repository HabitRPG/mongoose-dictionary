// Exports only the Dictionary plugin, 

// TODO remove this file and just set lib/plugin as main?

module.exports = function(mongoose){
  if(!mongoose) throw new Error('You must pass an instance of Mongoose to the module.');
  return require('./lib/plugin')(mongoose);
};