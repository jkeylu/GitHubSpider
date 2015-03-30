var workers = require('./workers');

module.exports = Spider;

function Spider(app) {
  this.app = app;
  this.previousWorker = new workers.PreviousWorker(app);
  this.latestWorker = new workers.LatestWorker(app);
}

Spider.prototype.run = function() {
  var self = this;
  this.app.db.collection('repositories').count({}, function(err, count) {
    self.latestWorker.start();

    if (err || count == 0) {
      self.latestWorker.traverser.once('finish', function() {
        startPreviousWork(self);
      });
      return;
    }

    self.previousWorker.start();
  });
};

function startPreviousWork(spider) {
  spider.app.db.collection('repositories').count({}, function(err, count) {
    if (err || count == 0) {
      spider.latestWorker.traverser.once('finish', function() {
        startPreviousWork(spider);
        return;
      });
      spider.previousWorker.start();
    }
  });
}
