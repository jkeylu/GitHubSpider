var util = require('util')
  , needle = require('needle')
  , async = require('async')
  , errors = require('./errors')
  , HttpError = errors.HttpError
  , RateLimitExceededError = errors.RateLimitExceededError
  , Http404Error = errors.Http404Error;

module.exports = GithubApi;

function GithubApi(tokenManager) {
  this.tokenManager = tokenManager;
}

function generateResponseHandler(token, tokenManager, callback) {
  return function(err, resp, body) {
    if (err) {
      return callback(err);
    }

    tokenManager.setRateLimit(token, resp.headers);

    if (resp.statusCode == 200) {
      return callback(null, body);
    }

    var msg;
    if (resp.statusCode == 403
      && body && body.message
      && (/rate limit exceeded/.test(body.message)
         || /abuse detection mechanism/.test(body.message))) {
      err = new RateLimitExceededError(body.message);

    } else if (resp.statusCode == 404) {
      msg = body && body.message || body;
      err = new Http404Error(body, msg);

    } else {
      msg = body && body.message || body;
      err = new HttpError(resp.statusCode, msg);
    }

    callback(err);
  };
}

GithubApi.prototype.fetchRepositories = function(since, callback) {
  var token = this.tokenManager.get();
  if (!token) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/repositories?since=%d', since);
  var options = { username: token };
  var handler = generateResponseHandler(token, this.tokenManager, callback);
  needle.get(url, options, handler);
};

GithubApi.prototype.fetchReadme = function(fullname, type, callback) {
  if (typeof type == 'function') {
    callback = type;
    type = 'full';
  }

  var token = this.tokenManager.get();
  if (!token) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/repos/%s/readme', fullname);
  var options = {
    username: token,
    headers: {
      accept: 'application/vnd.github.v3.' + type
    }
  };
  var handler = generateResponseHandler(token, this.tokenManager, function(err, readme) {
    if (err && err instanceof Http404Error) {
      err = null;
      readme = null;
    }
    if (Buffer.isBuffer(readme)) {
      readme = readme.toString();
    }
    callback(err, readme);
  });
  needle.get(url, options, handler);
};

GithubApi.prototype.fetchRepo = function(fullname, callback) {
  var token = this.tokenManager.get();
  if (!token) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/repos/%s', fullname);
  var options = { username: token };
  var handler = generateResponseHandler(token, this.tokenManager, callback);
  needle.get(url, options, handler);
};

/**
 * Usage:
 *
 * ```
 * githubApi.fetchRepoDetail(fullname, function(err, detail) {
 *   console.log(detail); // { repo: { ... }, readme: '' }
 * });
 * ```
 */
GithubApi.prototype.fetchRepoDetail = function(fullname, callback) {
  var self = this;
  async.parallel({
    repo: function(cb) {
      self.fetchRepo(fullname, cb);
    },
    readme: function(cb) {
      self.fetchReadme(fullname, 'html', cb);
    }
  }, callback);
};
