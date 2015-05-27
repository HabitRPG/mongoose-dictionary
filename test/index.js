var expect = require('chai').expect;
var mongoose = require('mongoose');

describe('Mongoose Dictionary Plugin', function(){

  before(function(done){
    mongoose.connect('mongodb://localhost/dictionary_plugin_testing_db', function(err){
      if(err) return done(err);

      mongoose.model('BaseModel', new mongoose.Schema({
        title: String
      }));

      return done();
    });
  });

  describe('#indexOf()', function(done){
    it('should return -1 when the value is not present', function(){
      expect([1,2,3].indexOf(4)).to.equal(-1); // 4 is not present in this array so indexOf returns -1
    })
  });

  after(function(done){
    mongoose.model('BaseModel').remove({}, function(err){
      if(err) return err(done);

      mongoose.disconnect(function(err){
        return err ? done(err) : done();
      });
    })
  });

});