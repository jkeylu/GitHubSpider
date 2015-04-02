var util = require('util')
  , Worker = require('./worker');

util.inherits(ElasticsearchWorker, Worker);
module.exports = ElasticsearchWorker;

function ElasticsearchWorker(app) {
  Worker.call(this, app);
}

ElasticsearchWorker.prototype.init = function() {
};

ElasticsearchWorker.prototype.start = function() {
};
