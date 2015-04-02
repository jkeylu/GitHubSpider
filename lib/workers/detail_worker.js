var needle = require('needle')
  , util = require('util')
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
  this.app.spider.previousWorker.traverser.on('since', function(since) {
  });

  this.app.spider.latestWorker.traverser.on('finish', function() {
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
  var check = function() {
    return self._running && self.list.length > 0;
  };
  var run = function(callback) {
    var repo = self.list.shift();
    if (!repo) {
      return process.nextTick(callback);
    }

    updateNoDetailRepo(repo.full_name, self.app.githubApi, self.app.db, function(err) {
      if (err) {
        if (err instanceof RateLimitExceededError) {
          self.list.push(repo);
          self._running = false;

        } else if (err instanceof Http404Error) {
          self.app.db.markRepoAsDeleted(repo.id);

        } else {
          console.error(err);
          if (repo.errorCount === undefined) {
            repo.errorCount = 0;
          } else {
            repo.errorCount++;
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
    }
  };
  async.whilst(check, run, end);
};

function updateNoDetailRepo(fullname, githubApi, db, callback) {
  githubApi.fetchRepoDetail(fullname, function(err, detail) {
    if (err) {
      return callback(err);
    }
    var repo = detail.repo;
    repo.readme = detail.readme;
    db.updateRepoDetail(repo, callback);
  });
}
