var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , Worker = require('./worker')
  , Traverser = require('../traverser');

util.inherits(LatestWorker, Worker);
module.exports = LatestWorker;

var LATEST_TRAVERSER_SINCE_PATH
  = path.resolve(__dirname, '../../tmp/latest_traverser_since.json');
var LATEST_TRAVERSER_FINISH_PATH
  = path.resolve(__dirname, '../../tmp/latest_traverser_finish');

/**
 * events: 'new', 'finish'
 */
function LatestWorker(app) {
  this.traverser = new Traverser(app);

  Worker.call(this, app);
}

LatestWorker.prototype.init = function() {
  var self = this;
  var tr = this.traverser;
  var db = this.app.db;

  tr.handleData = function(since, lastId, repos, done) {
    db.updateRepos(repos, function(err) {
      if (!err)
        self.emit('new');

      done(err);
    });
  };

  tr.on('since', function(id) {
    console.log('LatestWorker - since: %d', id);

    fs.writeFile(LATEST_TRAVERSER_SINCE_PATH, id, function(err) {
      if (err) {
        console.error('LatestWorker - save since error: %s', err);
      }
    });

  }).on('pause', function(id) {
    console.log('LatestWorker - pause at %d', id);

  }).on('resume', function(id) {
    console.log('LatestWorker - resume at %d', id);

  }).on('finish', function() {
    console.log('LatestWorker - finished.');
    fs.stat(LATEST_TRAVERSER_FINISH_PATH, function(err) {
      if (err) {
        fs.writeFile(LATEST_TRAVERSER_FINISH_PATH, '');
      }
      self.emit('finish');
    });

  }).on('error', function(err) {
    console.error('LatestWorker - error: %s', err);
    setTimeout(function() { startLatestTraverser(self); }, 5 * 60 * 1000);
  });
};

LatestWorker.prototype.start = function() {
  startLatestTraverser(this);
};

function startLatestTraverser(worker) {
  fs.readFile(LATEST_TRAVERSER_SINCE_PATH, function(err, since) {
    since = ~~since;

    worker.app.db.getLatestRepoId(function(err, id) {
      var since2 = err ? 0 : id;
      since = Math.min(since, since2);
      worker.traverser.traverse(since);
    });

  });
}

LatestWorker.isFirstTraverseFinished = function() {
  try {
    fs.statSync(LATEST_TRAVERSER_FINISH_PATH);
    return true;
  } catch(e) {
    return false;
  }
};
