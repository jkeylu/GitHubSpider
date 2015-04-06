var needle = require('needle')
  , util = require('util')
  , async = require('async')
  , Worker = require('./worker')
  , errors = require('../errors')
  , RateLimitExceededError = errors.RateLimitExceededError
  , Http404Error = errors.Http404Error;

util.inherits(DetailWorker, Worker);
module.exports = DetailWorker;

function DetailWorker(app) {
  this.list = [];
  this._running = false;

  Worker.call(this, app);
}

DetailWorker.prototype.init = function() {
  var self = this;

  this.app.spider.latestWorker.on('new', function() {
    console.log('DetailWorker - spider.latestWorker.on(\'new\')')
    self.start();
  });

  onTokenEnable(this);
};

function onTokenEnable(worker) {
  worker.app.tokenManager.on('enable', function() {
    worker.start();
  });
}

DetailWorker.prototype.start = function() {
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
          console.log('DetailWorker - Repo id: %d, fullname: %s not found.', repo.id, repo.full_name);
          console.log('DetailWorker - %s', err.toString());
          self.app.db.markRepoAsDeleted(repo.id);

        } else {
          console.error('DetailWorker - %s', err.toString());
          if (repo.errorCount === undefined) {
            repo.errorCount = 0;
          } else {
            repo.errorCount++;
            console.error('DetailWorker - Repo id: %d, fullname: %s fetch 3 times error', repo.id, repo.full_name);
          }
          if (repo.errorCount < 3) {
            self.list.push(repo);
          }
        }
      }
      setTimeout(callback, 0);
    });
  };
  var end = function(err) {
    if (err) {
      console.error(err);
      if (err instanceof RateLimitExceededError) {
        self._running = false;
        console.log('DetailWorker - end running');
        return;
      }
    }
    start();
  };

  var start = function() {
    if (self.list.length > 0) {
      console.log('DetailWorker - start running');
      async.whilst(check, run, end);
    } else {
      console.log('start db.getNoDetailRepos');
      self.app.db.getNoDetailRepos(100, function(err, repos) {
        if (err) {
          console.error('DetailWorker - db.getNoDetailRepos - %s', err);
          return;
        }
        console.log('DetailWorker - db.getNoDetailRepos -> repos.length: %d', repos.length);
        self.list = self.list.concat(repos);
        if (self.list.length > 0) {
          console.log('DetailWorker - start running');
          async.whilst(check, run, end);
        } else {
          self._running = false;
          console.log('DetailWorker - end running');
        }
      });
    }
  };
  start();
};

function updateNoDetailRepo(fullname, worker, callback) {
  var githubApi = worker.app.githubApi
    , db = worker.app.db;

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
