var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , needle = require('needle');

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
  tr.app.tokenManager.on('enable', function() {
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

  var token = tr.app.tokenManager.get();
  if (!token) {
    return pause(tr);
  }

  var url = util.format('https://api.github.com/repositories?since=%d', since);
  var options = { username: token };
  needle.get(url, options, function(err, resp, repos) {
    if (err) {
      tr.emit('error', err);
      return;
    }

    tr.app.tokenManager.setRateLimit(token, resp.headers);

    if (resp.statusCode == 403) {
      delayTraverse(tr, since, 0);
      return;

    } else if (resp.statusCode != 200) {
      var err;
      if (repos && repos.message) {
        err = new Error(repos.message);
      } else {
        err = new Error('Response Status Code: ' + resp.statusCode);
      }
      tr.emit('error', err);
      return;
    }

    if (repos.length == 0) {
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
