var util = require('util');

util.inherits(Http404Error, Error);
util.inherits(RateLimitExceededError, Error);

module.exports = {
  Http404Error: Http404Error,
  RateLimitExceededError: RateLimitExceededError
};

function Http404Error(msg) {
  Error.call(this, msg);
}

function RateLimitExceededError() {
  Error.call(this, 'API rate limit exceeded.');
}
