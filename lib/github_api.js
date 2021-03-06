var util = require('util')
  , needle = require('needle')
  , async = require('async')
  , AccessToken = require('./token')
  , errors = require('./errors')
  , HttpError = errors.HttpError
  , RateLimitExceededError = errors.RateLimitExceededError
  , RepoAccessBlockedError = errors.RepoAccessBlockedError
  , Http404Error = errors.Http404Error
  , pkg = require('./package.json');

module.exports = GithubApi;

var userAgent = pkg.name + '/' + pkg.version;
needle.defaults({
  accept: 'application/vnd.github.v3+json',
  user_agent: userAgent
});

function GithubApi(token) {
  this.token = new AccessToken(token);
}

function generateResponseHandler(token, callback) {
  return function(err, resp, body) {
    if (err) {
      return callback(err);
    }

    token.setRateLimit(resp.headers);

    if (resp.statusCode == 200) {
      return callback(null, body);
    }

    var msg;
    if (resp.statusCode == 403 && body && body.message) {
      if (/rate limit exceeded/.test(body.message)
        || /abuse detection mechanism/.test(body.message)) {
        err = new RateLimitExceededError(body.message);

      } else if (/Repository access blocked/.test(body.message)) {
        err = new RepoAccessBlockedError(body.message);
      }

    } else if (resp.statusCode == 404) {
      msg = body && body.message || body;
      err = new Http404Error(body, msg);
    }

    if (!err) {
      msg = body && body.message || body;
      err = new HttpError(resp.statusCode, msg);
    }

    callback(err);
  };
}

GithubApi.prototype.fetchRepositories = function(since, callback) {
  if (!this.token.enabled) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/repositories?since=%d', since);
  var token = this.token.content;
  var options = { username: token };
  var handler = generateResponseHandler(this.token, callback);
  needle.get(url, options, handler);
};

GithubApi.prototype.fetchReadme = function(fullname, type, callback) {
  if (typeof type == 'function') {
    callback = type;
    type = 'full';
  }

  if (!this.token.enabled) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/repos/%s/readme', fullname);
  var token = this.token.content;
  var options = {
    username: token,
    headers: {
      accept: 'application/vnd.github.v3.' + type
    }
  };
  var handler = generateResponseHandler(this.token, function(err, readme) {
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
  if (!this.token.enabled) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/repos/%s', fullname);
  var token = this.token.content;
  var options = { username: token };
  var handler = generateResponseHandler(this.token, callback);
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

GithubApi.prototype.fetchUsers = function(since, callback) {
  if (!this.token.enabled) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/users?since=%d', since);
  var token = this.token.content;
  var options = { username: token };
  var handler = generateResponseHandler(this.token, callback);
  needle.get(url, options, handler);
};

GithubApi.prototype.fetchUser = function(login, callback) {
  if (!this.token.enabled) {
    return callback(new RateLimitExceededError());
  }

  var url = util.format('https://api.github.com/users/%s', login);
  var token = this.token.content;
  var options = { username: token };
  var handler = generateResponseHandler(this.token, callback);
  needle.get(url, options, handler);
};

var _githubApi = null;
Object.defineProperty(GithubApi, 'instance', {
  get: function() {
    if (_githubApi === null) {
      if (!process.env.GITHUB_ACCESS_TOKEN) {
        throw new Error('Please set process.evn.GITHUB_ACCESS_TOKEN');
      }
      _githubApi = new GithubApi(process.env.GITHUB_ACCESS_TOKEN);
    }
    return _githubApi;
  }
});
