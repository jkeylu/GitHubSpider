var pick = require('lodash.pick')
  , async = require('async')

module.exports = Db;

function Db(database) {
  this._db = database;
  this.repositories = this._db.collection('repositories');
  this.users = this._db.collection('users');

  this.createIndex();
}

Db.prototype.createIndex = function() {
  var uniqueOptions = { unique: true, background: true };
  var createIndexCb = function(err, indexName) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('Db - Index (%s) created.', indexName);
  };

  this.repositories.createIndex('id', uniqueOptions, createIndexCb);
  this.users.createIndex('id', uniqueOptions, createIndexCb);
};

/**
 * Usage:
 *
 * ```
 * db.countrepositories(function(err, count) {
 *   console.log(count);
 * });
 * ```
 */
Db.prototype.countRepositories = function(callback) {
  this.repositories.count({}, callback);
};

/**
 * Usage:
 *
 * ```
 * db.getLatestRepoId(function(err, id) {
 *   console.log(id);
 * });
 * ```
 */
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

/**
 * Usage:
 *
 * ```
 * db.markReposAsDeleted(since, lastId, repos);
 * ```
 */
Db.prototype.markReposAsDeleted = function(since, lastId, repos) {
  var ids = repos.map(function(repo) {
    return repo.id;
  });
  var filter = {
    id: {
      $gt: since,
      $lte: lastId,
      $nin: ids
    }
  };
  var update = {
    $currentDate: { deleted_at: true },
    $set: { deleted: true }
  };
  this.repositories.updateMany(filter, update, function(err) {
    if (err)
      console.error('Db - markReposAsDeleted - %s', err);
  });
};

/**
 * Usage:
 *
 * ```
 * db.markRepoAsDeleted(id);
 * ```
 */
Db.prototype.markRepoAsDeleted = function(id) {
  var filter = { id: id };
  var update = {
    $currentDate: { deleted_at: true },
    $set: { deleted: true }
  };
  this.repositories.updateOne(filter, update, function(err) {
    if (err)
      console.error('Db - markRepoAsDeleted - %s', err);
  });
};

Db.prototype.markRepoAsBlocked = function(id) {
  var filter = { id: id };
  var update = {
    $currentDate: { blocked_at: true },
    $set: { blocked: true }
  };
  this.repositories.updateOne(filter, update, function(err) {
    if (err)
      console.error('Db - markRepoAsBlocked - %s', err);
  });
}

/**
 * Usage:
 *
 * ```
 * db.updateRepos(repos, function(err) {
 *   // ...
 * });
 * ```
 */
Db.prototype.updateRepos = function(repos, callback) {
  var repositories = this.repositories
    , users = this.users;

  var updateRepo = function(item, done) {
    var owner = pick(item.owner, ['login', 'id', 'avatar_url', 'type']);
    var repo = pick(item, ['id', 'name', 'full_name', 'private', 'description', 'fork']);
    repo.owner = { id: owner.id };
    repo.deleted = false;

    var options = { upsert: true };
    async.parallel([
      function(cb) {
        var filter = { id: repo.id }
          , update = { $set: repo };
        repositories.updateOne(filter, update, options, function(err, r) {
          cb(err);
        });
      },
      function (cb) {
        var filter = { id: owner.id }
          , update = { $set: owner };
        users.updateOne(filter, update, options, function(err, r) {
          cb(err);
        });
      }
    ], done);
  };

  async.each(repos, updateRepo, callback);
};

/**
 * Usage:
 *
 * ```
 * db.getNoDetailRepos(count, function(err, repos) {
 *   console.log(repos); // { id: 1, full_name: '...' }
 * });
 * ```
 */
Db.prototype.getNoDetailRepos = function(count, callback) {
  var query = {
    detail_updated_at: { $exists: false },
    blocked_at: { $exists: false },
    deleted_at: { $exists: false }
  };
  var options = {
    sort: [['id', 1]],
    limit: count,
    fields: {
      id: 1,
      full_name: 1
    }
  };
  this.repositories.find(query, options).toArray(callback);
};

/**
 * Usage:
 *
 * ```
 * db.updateReadme(id, readme, function(err) {
 *   // ...
 * });
 * ```
 */
Db.prototype.updateReadme = function(id, readme, callback) {
  var filter = { id: id }
    , update = {
      $currentDate: { readme_updated_at: true },
      $set: { readme: readme }
    };
  this.repositories.updateOne(filter, update, callback);
};

/**
 * Usage:
 *
 * ```
 * db.updateRepoDetail(repo, function(err) {
 *   // ...
 * });
 * ```
 */
Db.prototype.updateRepoDetail = function(repo, callback) {
  var keys = [
    'id', 'name', 'full_name', 'private', 'description', 'fork',
    'created_at', 'updated_at', 'pushed_at', 'size', 'stargazers_count',
    'watchers_count', 'language', 'forks_count', 'open_issues_count',
    'network_count', 'subscribers_count'
  ];
  var item = pick(repo, keys);
  item.created_at = new Date(item.created_at);
  item.updated_at = new Date(item.updated_at);
  item.pushed_at = new Date(item.pushed_at);

  if (item.fork === true) {
    if (repo.parent) {
      item.parent = { id: repo.parent.id };
    }
    if (repo.source) {
      item.source = { id: repo.source.id };
    }
  }

  var currentDate = { detail_updated_at: true };
  if (repo.readme) {
    item.readme = repo.readme;
    currentDate.readme_updated_at = true;
  }

  var filter = { id: item.id }
    , update = {
      $currentDate: currentDate,
      $set: item
    };
  this.repositories.updateOne(filter, update, callback);
};
