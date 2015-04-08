var util = require('util');

util.inherits(HttpError, Error);
util.inherits(Http403Error, HttpError);
util.inherits(Http404Error, HttpError);
util.inherits(RateLimitExceededError, Http403Error);

module.exports = {
  HttpError: HttpError,
  Http403Error: Http403Error,
  Http404Error: Http404Error,
  RateLimitExceededError: RateLimitExceededError
};

function HttpError(statusCode, message) {
  Error.call(this);
  this.statusCode = statusCode;
  this.message = message;
}

function Http404Error(msg) {
  HttpError.call(this, 404, msg);
}

function Http403Error(msg) {
  HttpError.call(this, 403, msg);
}

function RateLimitExceededError() {
  Http403Error.call(this, 'API rate limit exceeded.');
}
