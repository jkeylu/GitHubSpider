var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , RateLimitExceededError = require('./errors').RateLimitExceededError;

util.inherits(Traverser, EventEmitter);
module.exports = Traverser;

function Traverser(app, options) {
  options = options || {};

  this.app = app;
  this.delay = options.delay || 0;
  this.breakId = options.breakId ||  0;
  this.handleData = options.handleData || null;
  this.paused = false;
  this.currentId = 0;

  onTokenEnable(this);

  EventEmitter.call(this);
}

function onTokenEnable(tr) {
  tr.app.token.on('enable', function() {
    if (tr.paused) {
      resume(tr);
    }
  });
}

Traverser.prototype.traverse = function(since) {
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
  if (since < 0) {
    tr.emit('error', new Error('`since` should greater than or equal to zero.'));
    return;
  }

  tr.currentId = since;
  tr.emit('since', since);

  tr.app.githubApi.fetchRepositories(since, function(err, repos) {
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

  delayTraverse(tr, lastId);
}

function delayTraverse(traverser, since, delay) {
  setTimeout(function() {
    traverse(traverser, since);
  }, delay);
}
