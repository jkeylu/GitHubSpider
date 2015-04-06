var util = require('util')
  , Worker = require('./worker');

util.inherits(ElasticsearchWorker, Worker);
module.exports = ElasticsearchWorker;

function ElasticsearchWorker(app) {
  Worker.call(this, app);
}

ElasticsearchWorker.prototype.init = function() {
  var es = this.app.es;
  this.app.spider.detailWorker.on('detail', function(repo) {
    es.create();
  });
};

ElasticsearchWorker.prototype.start = function() {
};
