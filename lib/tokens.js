var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , needle = require('needle');

util.inherits(TokenManager, EventEmitter);
util.inherits(AccessToken, EventEmitter);

exports.AccessToken = AccessToken;
exports.TokenManager = TokenManager;
exports.manager = new TokenManager();

function AccessToken(token) {
  this.content = token;
  this.enabled = true;
}

AccessToken.prototype.enableAfter = function(delay) {
  console.log('"%s" delay %dms', this.content, delay)
  var self = this;
  setTimeout(function() {
    self.enabled = true;
    self.emit('enable');
  }, delay);
};


function TokenManager(tokens) {
  this.pool = [];

  if (tokens) {
    this.init(tokens);
  }
}

TokenManager.prototype.init = function(tokens) {
  var self = this;

  if (!tokens) {
    return;
  }

  if (!util.isArray(tokens)) {
    if ('string' != typeof tokens) {
      tokens = [ Object.prototype.toString.call(tokens) ];
    }
    tokens = [ tokens ];
  }

  var t = null;
  for (var i = 0; i < tokens.length; i++) {
    t = new AccessToken(tokens[i]);
    t.on('enable', function() {
      self.emit('enable');
    });
    this.pool.push(t);
  }
};

TokenManager.prototype.get = function() {
  for (var i = 0, len = this.pool.length; i < len; i++) {
    if (this.pool[i].enabled) {
      return this.pool[i].content;
    }
  }
  return null;
};

TokenManager.prototype.setRateLimit = function(tokenContent, headers) {
  if (headers['x-ratelimit-remaining'] != '0') {
    return;
  }

  var token = null;
  for (var i = 0, len = this.pool.length; i < len; i++) {
    if (this.pool[i].content == tokenContent) {
      token = this.pool[i];
      break;
    }
  }

  if (token != null) {
    if (token.enabled) {
      token.enabled = false;

      var reset = headers['x-ratelimit-reset'] * 1000;
      var delay = reset - (new Date()).valueOf();
      if (delay < 0)
        delay = 0;

      token.enableAfter(delay);
    }
  }
};
