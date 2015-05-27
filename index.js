// Exports the Dictionary plugin, 

module.exports = function(mongoose){
  if(!mongoose) throw new Error('You must pass an instance of Mongoose to the module.');
  return require('./lib/plugin')(mongoose);
};