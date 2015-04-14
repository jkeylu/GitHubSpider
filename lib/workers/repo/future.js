var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , Worker = require('../worker')
  , Traverser = require('../../traverser');

util.inherits(RepoFutureWorker, Worker);
module.exports = RepoFutureWorker;

var REPO_FUTURE_SINCE_PATH
  = path.resolve(__dirname, '../../../tmp/repo_future_since');

var LATEST_TRAVERSER_FINISH_PATH
  = path.resolve(__dirname, '../../../tmp/latest_traverser_finish');

/**
 * events: 'new', 'finish'
 */
function RepoFutureWorker(workerManager) {
  this.traverser = new Traverser('repo');

  Worker.call(this, 'repo:future', workerManager);
}

RepoFutureWorker.prototype.init = function() {
  var self = this;
  var tr = this.traverser;
  var db = this.workerManager.db;

  tr.handleData = function(since, lastId, repos, done) {
    db.updateRepos(repos, function(err) {
      if (!err)
        self.emit('new');

      done(err);
    });
  };

  tr.on('since', function(id) {
    console.log('RepoFutureWorker - since: %d', id);

    fs.writeFile(REPO_FUTURE_SINCE_PATH, id, function(err) {
      if (err) {
        console.error('RepoFutureWorker - save since error: %s', err);
      }
    });

  }).on('pause', function(id) {
    console.log('RepoFutureWorker - pause at %d', id);

  }).on('resume', function(id) {
    console.log('RepoFutureWorker - resume at %d', id);

  }).on('finish', function() {
    console.log('RepoFutureWorker - finished.');
    fs.stat(LATEST_TRAVERSER_FINISH_PATH, function(err) {
      if (err) {
        fs.writeFile(LATEST_TRAVERSER_FINISH_PATH, '');
      }
      self.emit('finish');
    });

  }).on('error', function(err) {
    console.error('RepoFutureWorker - error: %s', err);
    setTimeout(function() { startLatestTraverser(self); }, 5 * 60 * 1000);
  });
  return this;
};

RepoFutureWorker.prototype.start = function() {
  startLatestTraverser(this);
};

function startLatestTraverser(worker) {
  fs.readFile(REPO_FUTURE_SINCE_PATH, function(err, since) {
    since = ~~since;

    worker.app.db.getLatestRepoId(function(err, id) {
      var since2 = err ? 0 : id;
      since = Math.min(since, since2);
      worker.traverser.traverse(since);
    });

  });
}

RepoFutureWorker.prototype.stop = function(callback) {
  this.traverser.stop(callback);
};

RepoFutureWorker.isFirstTraverseFinished = function() {
  try {
    fs.statSync(LATEST_TRAVERSER_FINISH_PATH);
    return true;
  } catch(e) {
    return false;
  }
};
