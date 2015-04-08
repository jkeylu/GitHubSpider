var util = require('util');

util.inherits(Http404Error, Error);
util.inherits(RateLimitExceededError, Error);

module.exports = {
  Http404Error: Http404Error,
  RateLimitExceededError: RateLimitExceededError
};

function Http404Error(msg) {
  Error.call(this);
  this.message = msg;
}

function RateLimitExceededError() {
  Error.call(this);
  this.message = 'API rate limit exceeded.';
}
