var EventEmitter = require('events').EventEmitter
  , util = require('util')
  , needle = require('needle')
  , tokens = require('./tokens');

util.inherits(Traverser, EventEmitter);

module.exports = Traverser;

function Traverser(options) {
  options = options || {};

  this.delay = options.delay || 0;
  this.breakId = 0;
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

function traverse(tr, since) {
  if (since < 0) {
    tr.emit('error', new Error('`since` should greater than or equal to zero.'));
    return;
  }

  tr.emit('since', since);

  var token = tokens.manager.get();
  if (!token) {
    tr.emit('pause', since);
    return;
  }

  var url = util.format('https://api.github.com/repositories?since=%d', since);
  var options = { username: token };
  needle.get(url, options, function(err, resp, repos) {
    if (err) {
      tr.emit('error', err);
      return;
    }

    tokens.manager.setRateLimit(token, resp.headers);

    if (resp.statusCode == 403) {
      _traverse(tr, since, 0);
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
      tr.emit('finish', since);
      return;
    }

    var lastId = repos[repos.length - 1].id;
    tr.emit('data', repos);

    if (tr.breakId > 0 && lastId >= tr.breakId) {
      tr.emit('finish', lastId);
      return;
    }

    _traverse(tr, lastId);
  });
}

function _traverse(traverser, since, delay) {
  setTimeout(function() {
    traverse(traverser, since);
  }, delay);
}
