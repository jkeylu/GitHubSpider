var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , needle = require('needle');

util.inherits(AccessToken, EventEmitter);
module.exports = AccessToken;

function AccessToken(token) {
  this.content = token;
  this.enabled = true;
  EventEmitter.call(this);
}

AccessToken.prototype.getRateLimit = function(callback) {
  var self = this;
  var url = 'https://api.github.com/rate_limit'
    , options = { username: self.content };

  needle.get(url, options, function(err, resp, body) {
    if (!err) {
      self.setRateLimit(resp.headers);
    }

    callback(err, body);
  });
};

AccessToken.prototype.enableAfter = function(delay) {
  var self = this;

  var enableTime = new Date((new Date()).valueOf() + delay);
  console.log('Token - Access token will delay %ds and enable at %s',
    (delay / 1000), enableTime.toISOString());

  setTimeout(function() {
    self.enabled = true;
    self.emit('enable');
  }, delay);
};

AccessToken.prototype.setRateLimit = function(headers) {
  if (headers['x-ratelimit-remaining'] != '0') {
    return;
  }

  if (token.enabled) {
    token.enabled = false;

    var reset = headers['x-ratelimit-reset'] * 1000
      , delay = reset - (new Date()).valueOf();

    if (delay < 1000) {
      delay = 1000;
    }

    this.enableAfter(delay);
  }
};
