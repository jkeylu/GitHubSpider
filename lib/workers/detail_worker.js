var needle = require('needle')
  , RateLimitExceededError = require('../tokens').RateLimitExceededError;

module.exports = DetailWorker;

function DetailWorker(app) {
  this.app = app;
  this.list = [];
  this._running = false;
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
    return self.list.length > 0;
  };
  var run = function(callback) {
    var fullname = self.list.shift();
    if (!fullname) {
      return process.nextTick(callback);
    }

    updateRepoDetail(self, fullname, function(err) {
      if (err) {
        if (err instanceof RateLimitExceededError) {
          self.list.push(fullname);
        } else {
          console.error(err);
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
