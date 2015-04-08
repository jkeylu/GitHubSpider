var util = require('util')
  , needle = require('needle')
  , async = require('async')
  , errors = require('./errors')
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

    if (resp.statusCode != 200) {
      if (resp.statusCode == 403) {
        console.log(resp.headers);
        console.log(body);
        err = new RateLimitExceededError();

      } else if (resp.statusCode == 404) {
        err = new Http404Error(body);

      } else if (body && body.message) {
        err = new Error(body.message);

      } else {
        err = new Error('Response Status Code: ' + resp.statusCode);
      }

      return callback(err);
    }

    callback(null, body);
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
