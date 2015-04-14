var util = require('util')
  , async = require('async')
  , Worker = require('../worker')
  , githubApi = require('../../github_api').instance
  , errors = require('../../errors')
  , RateLimitExceededError = errors.RateLimitExceededError
  , RepoAccessBlockedError = errors.RepoAccessBlockedError
  , Http404Error = errors.Http404Error;

util.inherits(RepoDetailWorker, Worker);
module.exports = RepoDetailWorker;

function RepoDetailWorker(workerManager) {
  this.list = [];
  this._running = false;

  Worker.call(this, 'repo:detail', workerManager);
}

RepoDetailWorker.prototype.init = function() {
  var self = this;

  this.initIfExists('repo:future', function(worker) {
    worker.on('new', function() {
      self.start();
    });
  });

  onTokenEnable(this);
};

function onTokenEnable(worker) {
  worker.app.tokenManager.on('enable', function() {
    worker.start();
  });
}

RepoDetailWorker.prototype.start = function() {
  var self = this;

  if (this._running) {
    return;
  }
  this._running = true;

  var check = function() {
    return self._running && self.list.length > 0;
  };
  var run = function(callback) {
    var repo = self.list.shift();
    if (!repo) {
      return process.nextTick(callback);
    }

    updateNoDetailRepo(repo.full_name, self, function(err) {
      if (err) {
        if (err instanceof RateLimitExceededError) {
          self.list.push(repo);
          return callback(err);

        } else if (err instanceof Http404Error) {
          console.log('RepoDetailWorker - Repo id: %d, fullname: %s, %s.',
                      repo.id, repo.full_name, err.message);
          self.app.db.markRepoAsDeleted(repo.id);

        } else if (err instanceof RepoAccessBlockedError) {
          console.log('RepoDetailWorker - Repo id: %d, fullname: %s, %s.',
                      repo.id, repo.full_name, err.message);
          self.app.db.markRepoAsBlocked(repo.id);

        } else {
          console.error('RepoDetailWorker - Unknown error: %s', err);

          if (repo.errorCount === undefined) {
            repo.errorCount = 0;
          } else {
            repo.errorCount++;
          }

          if (repo.errorCount < 3) {
            self.list.push(repo);
          } else {
            console.error('RepoDetailWorker - Repo id: %d, fullname: %s fetch 3 times error',
                          repo.id, repo.full_name);
          }
        }
      }
      setTimeout(callback, 0);
    });
  };
  var end = function(err) {
    if (err) {
      console.error('RepoDetailWorker - end Error: %s', err);
      if (err instanceof RateLimitExceededError) {
        self._running = false;
        return;
      }
    }
    start();
  };

  var start = function() {
    if (self.list.length > 0) {
      console.log('RepoDetailWorker - start running');
      async.whilst(check, run, end);
    } else {
      console.log('start db.getNoDetailRepos');
      self.app.db.getNoDetailRepos(100, function(err, repos) {
        if (err) {
          console.error('RepoDetailWorker - db.getNoDetailRepos - %s', err);
          return;
        }
        console.log('RepoDetailWorker - db.getNoDetailRepos -> repos.length: %d',
                    repos.length);
        self.list = self.list.concat(repos);
        if (self.list.length > 0) {
          console.log('RepoDetailWorker - start running');
          async.whilst(check, run, end);
        } else {
          self._running = false;
          console.log('RepoDetailWorker - end running');
        }
      });
    }
  };
  start();
};

function updateNoDetailRepo(fullname, worker, callback) {
  var db = worker.app.db;

  githubApi.fetchRepoDetail(fullname, function(err, detail) {
    if (err) {
      return callback(err);
    }
    var repo = detail.repo;
    repo.readme = detail.readme;
    db.updateRepoDetail(repo, callback);
    worker.emit('detail', repo);
  });
}

RepoDetailWorker.prototype.stop = function(callback) {
};
