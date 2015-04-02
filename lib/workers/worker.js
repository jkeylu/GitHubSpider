var util = require('util')
  , EventEmitter = require('events').EventEmitter;

util.inherits(Worker, EventEmitter);

module.exports = Worker;

function Worker(app) {
  this.app = app;

  EventEmitter.call(this);
}

Worker.prototype.init = function() {};
Worker.prototype.start = function() {};
