var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , githubApi = require('./github_api').instance
  , RateLimitExceededError = require('./errors').RateLimitExceededError;

util.inherits(Traverser, EventEmitter);
module.exports = Traverser;

function Traverser(type, options) {
  options = options || {};

  this.delay = options.delay || 0;
  this.breakId = options.breakId ||  0;
  this.handleData = options.handleData || null;
  this.paused = false;
  this.stopping = false;
  this.stopped = false;
  this.currentId = 0;

  if (type == 'repo') {
    this.fetchData = function(since, callback) {
      githubApi.fetchRepositories(since, callback);
    };
  } else if (type == 'user') {
    this.fetchData = function(since, callback) {
      githubApi.fetchUsers(since, callback);
    };
  } else {
    throw new Error('Traverser - Error type: %s', type);
  }

  onTokenEnable(this);

  EventEmitter.call(this);
}

function onTokenEnable(tr) {
  githubApi.token.on('enable', function() {
    if (tr.paused) {
      resume(tr);
    }
  });
}

Traverser.prototype.traverse = function(since) {
  this.stopping = false;
  this.stopped = false;

  since = ~~since;

  if (arguments.length > 1) {
    var breakId = arguments[1];
    breakId = ~~breakId;
    this.breakId = breakId;
  }

  traverse(this, since);
}

function pause(tr) {
  tr.paused = true;
  tr.emit('pause', tr.currentId);
}

function resume(tr) {
  tr.paused = false;
  tr.emit('resume', tr.currentId);
  traverse(tr, tr.currentId);
}

function traverse(tr, since) {
  if (tr.stopped) {
    return;
  }
  if (since < 0) {
    tr.emit('error', new Error('`since` should greater than or equal to zero.'));
    return;
  }

  tr.currentId = since;
  tr.emit('since', since);

  tr.fetchData(since, function(err, repos) {
    if (err) {
      if (err instanceof RateLimitExceededError) {
        return pause(tr);
      } else {
        tr.emit('error', err);
        return;
      }
    }

    if (!repos || repos.length == 0) {
      tr.emit('finish');
      return;
    }

    var lastId = repos[repos.length - 1].id;
    if (tr.handleData) {
      tr.handleData(since, lastId, repos, function(err) {
        if (err) {
          tr.emit('error', err);
          return;
        }
        _traverse(tr, lastId);
      })

    } else {
      tr.emit('data', since, lastId, repos);
      _traverse(tr, lastId);
    }

  });
}

function _traverse(tr, lastId) {
  if (tr.breakId > 0 && lastId >= tr.breakId) {
    tr.emit('finish');
    return;
  }

  delayTraverse(tr, lastId, tr.delay);
}

function delayTraverse(tr, since, delay) {
  if (tr.stopping) {
    this.emit('_stop_');
    return;
  }
  setTimeout(function() {
    traverse(tr, since);
  }, delay);
}

Traverser.prototype.stop = function(callback) {
  var self = this;

  if (this.stopped) {
    return callback();
  }
  if (this.paused) {
    this.stopped = true;
    return callback();
  }
  this.stopping = true;
  this.once('_stop_', function() {
    self.stopping = false;
    self.stopped = true;
    callback();
  });
};
