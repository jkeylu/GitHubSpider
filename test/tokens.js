var assert = require('assert');
var tokens = require('../lib/tokens');
var util = require('util');

describe('tokens', function() {
  var SINGLE_TOKEN1 = 'hello';
  var SINGLE_TOKEN2 = 'world';
  var TOKEN_ARRAY = [ SINGLE_TOKEN1, SINGLE_TOKEN2 ];
  var OBJECT_TOKEN = new String(SINGLE_TOKEN1);

  describe('exports', function() {
    it('should have a "AccessToken" property', function() {
      assert(tokens.hasOwnProperty('AccessToken'));
      assert.equal('function', typeof tokens.AccessToken);
    });

    it('should have a "TokenManager" property', function() {
      assert(tokens.hasOwnProperty('TokenManager'));
      assert.equal('function', typeof tokens.TokenManager);
    });

    it('should have a "manager" property', function() {
      assert(tokens.hasOwnProperty('manager'));
    });
  });

  describe('.manager', function() {
    it('should be instance of "TokenManager"', function() {
      assert(tokens.manager instanceof tokens.TokenManager);
    });
  });

  describe('AccessToken', function() {
    it('should emit a "enable" event', function(done) {
      var token = new tokens.AccessToken(SINGLE_TOKEN1);
      token.on('enable', function() {
        done();
      });
      token.enableAfter(100);
    });

    it('should set enabled = true after delay time', function(done) {
      var token = new tokens.AccessToken(SINGLE_TOKEN1);
      token.on('enable', function() {
        assert.equal(true, token.enabled);
        done();
      });
      token.enabled = false;
      token.enableAfter(100);
    });
  });

  describe('TokenManager', function() {
    it('should accept String type of data', function() {
      assert.equal('string', typeof SINGLE_TOKEN1);
      var manager = new tokens.TokenManager(SINGLE_TOKEN1);
      assert(manager.pool.length > 0);
    });

    it('should accept Array type of data', function() {
      assert(util.isArray(TOKEN_ARRAY));
      var manager = new tokens.TokenManager(TOKEN_ARRAY);
      assert(manager.pool.length > 1);
    });

    it('should accept Object type of data', function() {
      assert.equal('object', typeof OBJECT_TOKEN);
      var manager = new tokens.TokenManager(OBJECT_TOKEN);
      assert(manager.pool.length > 0);
    });

    it('should emit a "enable" event', function(done) {
      var manager = new tokens.TokenManager(SINGLE_TOKEN1);
      manager.on('enable', function() {
        done();
      });
      var headers = {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '' + ((new Date().valueOf() + 100) / 1000)
      };
      manager.setRateLimit(SINGLE_TOKEN1, headers);
    });

    it('should be no more token enabled', function() {
      var manager = new tokens.TokenManager(SINGLE_TOKEN1);
      var headers = {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '' + ((new Date().valueOf() + 100) / 1000)
      };
      manager.setRateLimit(SINGLE_TOKEN1, headers);
      assert.equal(null, manager.get());
    });
  });
});
