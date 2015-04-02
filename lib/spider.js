var workers = require('./workers');

module.exports = Spider;

function Spider(app) {
  this.app = app;

  if (this.app.config.runPreviousWorker) {
    this.previousWorker = new workers.PreviousWorker(app);
  }
  this.latestWorker = new workers.LatestWorker(app);
  this.detailWorker = new workers.DetailWorker(app);
  this.elasticsearchWorker = new workers.ElasticsearchWorker(app);
}

Spider.prototype.init = function() {
  if (this.app.config.runPreviousWorker) {
    this.previousWorker.init();
  }
  this.latestWorker.init();
  this.detailWorker.init();
  this.elasticsearchWorker.init();

  return this;
};

Spider.prototype.run = function() {
  if (!this.app.config.runPreviousWorker) {
    this.latestWorker.start();
    return;
  }

  var self = this;
  this.app.db.countRepositories(function(err, count) {
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
  spider.app.db.countRepositories(function(err, count) {
    if (err || count == 0) {
      spider.latestWorker.traverser.once('finish', function() {
        startPreviousWork(spider);
        return;
      });
      spider.previousWorker.start();
    }
  });
}
