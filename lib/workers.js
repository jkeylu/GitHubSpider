var fs = require('fs')
  , path = require('path')
  , pick = require('lodash.pick')
  , async = require('async')
  , Traverser = require('./traverser');

var PREVIOUS_TRAVERSER_SINCE_PATH
  = path.resolve(__dirname, '../tmp/previous_traverser_since.json');

function updateRepos(db, repos, done) {
  var repositories = db.collection('repositories');
  var users = db.collection('users');

  async.each(repos, function(item, callback) {
    var owner = pick(item.owner, ['login', 'id', 'avatar_url', 'type']);
    var repo = pick(item, ['id', 'name', 'full_name', 'private', 'description', 'fork'])
    repo.owner = { id: owner.id };
    repo.gone = false;

    async.parallel([
      function(cb) {
        repositories.updateOne({ id: repo.id }, repo, { upsert: true }, function(err, r) {
          cb(err);
        });
      },
      function (cb) {
        users.updateOne({ id: owner.id }, owner, { upsert: true }, function(err, r) {
          cb(err);
        });
      }
    ], function(err) {
      callback(err);
    });

  }, function(err) {
    done(err);
  });
}

function PreviousWorker(app) {
  var self = this;
  var tr = new Traverser();

  tr.handleData = function(since, lastId, repos, done) {
    var repositories = app.db.collection('repositories');
    var ids = repos.map(function(repo) {
      return repo.id;
    });
    var filter = {
      $and: [
        { id: { $gt: since } },
        { id: { $lte: lastId } },
        { id: { $nin:  ids } }
      ]
    };
    var update = {
      $currentDate: { gone_at: true },
      $set: { gone: true }
    };
    repositories.updateMany(filter, update, function(err) {
      if (err)
        console.error('PreviousWorker - "set repo gone": %s', err);
    });
    updateRepos(app.db, repos, done);
  };

  tr.on('since', function(id) {
    console.log('PreviousWorker - since: %d', id);
    fs.writeFile(PREVIOUS_TRAVERSER_SINCE_PATH, id, function(err) {
      console.error('PreviousWorker - %s', err);
    });

  }).on('pause', function(id) {
    console.log('PreviousWorker - pause at %d', id);

  }).on('resume', function(id) {
    console.log('PreviousWorker - resume at %d', id);

  }).on('finish', function() {
    console.log('PreviousWorker - finished.');

    fs.unlink(PREVIOUS_TRAVERSER_SINCE_PATH, function(err) {
      setTimeout(function() { startPreviousTraverser(self); }, 5 * 60 * 1000);
    });

  }).on('error', function(err) {
    console.error('PreviousWorker - %s', err);

    setTimeout(function() { startPreviousTraverser(self); }, 5 * 60 * 1000);
  });

  this.traverser = tr;
  this.app = app;
}

PreviousWorker.prototype.start = function() {
  startPreviousTraverser(this);
};

function startPreviousTraverser(worker) {
  var repositories = worker.app.db.collection('repositories');

  fs.readFile(PREVIOUS_TRAVERSER_SINCE_PATH, function(err, since) {
    since = ~~since;
    var options = { sort: [['id', -1]], fields: { id: 1 } };

    repositories.findOne({}, options, function(err, r) {
      var lastId = 1;
      if (!err) {
        lastId = r.id;
      }

      worker.traverser.traverse(since, lastId);
    });
  });
}

function LatestWorker(app) {
  var self = this;
  var tr = new Traverser();
  tr.handleData = function(repos, done) {
    updateRepos(app.db, repos, done);
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
    console.error('LatestWorker - %s', err);

    setTimeout(function() { startLatestTraverser(self); }, 5 * 60 * 1000);
  });

  this.traverser = tr;
  this.app = app;
}

LatestWorker.prototype.start = function() {
  startLatestTraverser(this);
};

function startLatestTraverser(worker) {
  var repositories = worker.app.db.collection('repositories');

  var options = { sort: [['id', -1]], fields: { id: 1 } };
  repositories.findOne({}, options, function(err, r) {
    var since = (err || !r) ? 0 : ~~r.id;
    worker.traverser.traverse(since);
  });
}

module.exports = {
  PreviousWorker: PreviousWorker,
  LatestWorker: LatestWorker
};
