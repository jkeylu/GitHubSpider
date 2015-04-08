var util = require('util');

util.inherits(HttpError, Error);
util.inherits(Http404Error, HttpError);
util.inherits(RateLimitExceededError, HttpError);
util.inherits(RepoAccessBlockedError, HttpError);

module.exports = {
  HttpError: HttpError,
  Http404Error: Http404Error,
  RateLimitExceededError: RateLimitExceededError,
  RepoAccessBlockedError: RepoAccessBlockedError
};

function HttpError(statusCode, message) {
  Error.call(this);
  this.statusCode = statusCode;
  this.message = message;
}

function Http404Error(msg) {
  HttpError.call(this, 404, msg || 'Not found');
}

function RateLimitExceededError(msg) {
  HttpError.call(this, 403, msg || 'API rate limit exceeded');
}

function RepoAccessBlockedError(msg) {
  HttpError.call(this, 403, msg || 'Repository access blocked');
}
