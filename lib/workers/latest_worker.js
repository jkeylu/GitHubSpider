var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , Traverser = require('../traverser');

util.inherits(LatestWorker, EventEmitter);

module.exports = LatestWorker;

function LatestWorker(app) {
  this.app = app;
  this.traverser = new Traverser(app);
}

LatestWorker.prototype.init = function() {
  var self = this;
  var tr = this.traverser;
  var db = this.app.db;

  tr.handleData = function(since, lastId, repos, done) {
    db.updateRepos(repos, done);
  };

  tr.on('since', function(id) {
    console.log('LatestWorker - since: %d', id);

  }).on('pause', function(id) {
    console.log('LatestWorker - pause at %d', id);

  }).on('resume', function(id) {
    console.log('LatestWorker - resume at %d', id);

  }).on('finish', function() {
    console.log('LatestWorker - finished.');

  }).on('error', function(err) {
    console.error('LatestWorker - error: %s', err);
    setTimeout(function() { startLatestTraverser(self); }, 5 * 60 * 1000);
  });
};

LatestWorker.prototype.start = function() {
  startLatestTraverser(this);
};

function startLatestTraverser(worker) {
  worker.app.db.getLatestRepoId(function(err, id) {
    var since = err ? 0 : id;
    worker.traverser.traverse(since);
  });
}
