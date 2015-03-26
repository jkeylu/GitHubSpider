var assert = require('assert');
var Traverser = require('../lib/traverser');
var tokens = require('../lib/tokens');
var TEST_TOKEN = require('./access_token');

describe('Traverser', function() {
  it('should export a function', function() {
    assert.equal('function', typeof Traverser);
  });

  it('should emit a "error" event when `since` less then zero', function(done) {
    var traverser = new Traverser();
    traverser.on('error', function(err) {
      assert.notEqual(null, err);
      assert.notEqual(undefined, err);
      assert(err instanceof Error);
      assert.equal('`since` should greater than or equal to zero.', err.message);
      done();
    });
    traverser.traverse(-1);
  });

  it('should emit a "since" event', function(done) {
    var traverser = new Traverser();
    traverser.on('since', function(since) {
      assert.notEqual(null, since);
      assert.notEqual(undefined, since);
      assert.equal('number', typeof since);
      assert.equal(0, since);
      done();
    });
    traverser.traverse();
  });

  it('should emit a "pause" event', function(done) {
    var traverser = new Traverser();
    traverser.on('pause', function(since) {
      assert.notEqual(null, since);
      assert.notEqual(undefined, since);
      assert.equal('number', typeof since);
      done();
    });
    traverser.traverse();
  });

  it('should emit a "finish" event when no more repositories', function(done) {
    tokens.manager.init(TEST_TOKEN);
    var traverser = new Traverser();
    traverser.on('finish', function(since) {
      done();
    });
    traverser.traverse(1000000000);
  });

  it('should emit a "finish" event when `since` less than `breakId`', function(done) {
    tokens.manager.init(TEST_TOKEN);
    var traverser = new Traverser();
    traverser.on('finish', function(since) {
      done();
    });
    traverser.traverse(0, 1);
    assert.equal(1, traverser.breakId);
  });

  it('should emit a "data" event', function(done) {
    tokens.manager.init(TEST_TOKEN);
    var traverser = new Traverser();
    traverser.on('data', function(data) {
      done();
    });
    traverser.traverse(0, 1);
  });
});
