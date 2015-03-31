var workers = require('./workers');

module.exports = Spider;

function Spider(app) {
  this.app = app;

  this.previousWorker = new workers.PreviousWorker(app);
  this.latestWorker = new workers.LatestWorker(app);
  this.detailWorker = new workers.DetailWorker(app);
  this.elasticsearchWorker = new workers.ElasticsearchWorker(app);
}

Spider.prototype.init = function() {
  this.previousWorker.init();
  this.latestWorker.init();
  this.detailWorker.init();
  this.elasticsearchWorker.init();

  return this;
};

Spider.prototype.run = function() {
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
