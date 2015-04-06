var workers = require('./workers');

module.exports = Spider;

function Spider(app) {
  this.app = app;

  this.latestWorker = new workers.LatestWorker(app);
  this.detailWorker = new workers.DetailWorker(app);

  if (this.app.config.runPreviousWorker) {
    this.previousWorker = new workers.PreviousWorker(app);
  }
  if (this.app.config.runElasticsearchWorker) {
    this.elasticsearchWorker = new workers.ElasticsearchWorker(app);
  }
}

Spider.prototype.init = function() {
  this.latestWorker.init();
  this.detailWorker.init();

  if (this.app.config.runPreviousWorker) {
    this.previousWorker.init();
  }
  if (this.app.config.runElasticsearchWorker) {
    this.elasticsearchWorker.init();
  }

  return this;
};

Spider.prototype.run = function() {
  this.latestWorker.start();
  this.detailWorker.start();

  if (this.app.config.runPreviousWorker) {
    this.previousWorker.start();
  }
  if (this.app.config.runElasticsearchWorker) {
    this.elasticsearchWorker.start();
  }
};
