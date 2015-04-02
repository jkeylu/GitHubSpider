var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , Worker = require('./worker')
  , Traverser = require('../traverser');

util.inherits(PreviousWorker, Worker);
module.exports = PreviousWorker;

var PREVIOUS_TRAVERSER_SINCE_PATH
  = path.resolve(__dirname, '../../tmp/previous_traverser_since.json');

function PreviousWorker(app) {
  this.traverser = new Traverser(app);

  Worker.call(this, app);
}

PreviousWorker.prototype.init = function() {
  var self = this;
  var tr = this.traverser;
  var db = this.app.db;

  tr.handleData = function(since, lastId, repos, done) {
    db.markAsDeleted(since, lastId, repos);
    db.updateRepos(repos, done);
  };

  tr.on('since', function(id) {
    console.log('PreviousWorker - since: %d', id);

    fs.writeFile(PREVIOUS_TRAVERSER_SINCE_PATH, id, function(err) {
      if (err) {
        console.error('PreviousWorker - save since error: %s', err);
      }
    });

  }).on('pause', function(id) {
    console.log('PreviousWorker - pause at %d', id);

  }).on('resume', function(id) {
    console.log('PreviousWorker - resume at %d', id);

  }).on('finish', function() {
    console.log('PreviousWorker - finished.');

    fs.unlink(PREVIOUS_TRAVERSER_SINCE_PATH, function(err) {
      if (err) {
        console.error('PreviousWorker - unlink since file: %s', err);
      }
      setTimeout(function() { startPreviousTraverser(self); }, 5 * 60 * 1000);
    });

  }).on('error', function(err) {
    console.error('PreviousWorker - error: %s', err);
    setTimeout(function() { startPreviousTraverser(self); }, 5 * 60 * 1000);
  });
};

PreviousWorker.prototype.start = function() {
  startPreviousTraverser(this);
};

function startPreviousTraverser(worker) {
  fs.readFile(PREVIOUS_TRAVERSER_SINCE_PATH, function(err, since) {
    since = ~~since;

    worker.app.db.getLatestRepoId(function(err, lastId) {
      if (err) {
        lastId = 1;
      }
      lastId = ~~lastId;
      if (lastId <= 0) {
        lastId = 1;
      }

      worker.traverser.traverse(since, lastId);
    });
  });
}
