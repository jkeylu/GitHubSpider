var pick = require('lodash.pick')
  , async = require('async')

module.exports = Db;

function Db(database) {
  this._db = database;
  this.repositories = this._db.collection('repositories');
  this.users = this._db.collection('users');
}

Db.prototype.countRepositories = function(done) {
  this.repositories.count({}, done);
};

Db.prototype.getLatestRepoId = function(callback) {
  var options = { sort: [['id', -1]], fields: { id: 1 } };

  this.repositories.findOne({}, options, function(err, r) {
    if (err) {
      callback(err);
      return;
    }
    var id = r ? r.id : 0;
    callback(null, id);
  });
};

Db.prototype.markAsDeleted = function(since, lastId, repos) {
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
    $currentDate: { deleted_at: true },
    $set: { deleted: true }
  };
  this.repositories.updateMany(filter, update, function(err) {
    if (err)
      console.error('PreviousWorker - "set repo gone": %s', err);
  });
};

Db.prototype.updateRepos = function(repos, callback) {
  var repositories = this.repositories
    , users = this.users;

  var update = function(item, done) {
    var owner = pick(item.owner, ['login', 'id', 'avatar_url', 'type']);
    var repo = pick(item, ['id', 'name', 'full_name', 'private', 'description', 'fork'])
    repo.owner = { id: owner.id };
    repo.deleted = false;

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
    ], done);
  };

  async.each(repos, update, callback);
};

Db.prototype.updateReadme = function() {
};

Db.prototype.updateRepoDetail = function() {
};
