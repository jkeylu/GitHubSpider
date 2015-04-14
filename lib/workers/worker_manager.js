var util = require('util')
  , EventEmitter = require('events').EventEmitter
  , async = require('async');

util.inherits(WorkerManager, EventEmitter);
module.exports = WorkerManager;

function WorkerManager() {
  this.db = null;
  this.workers = {};

  EventEmitter.call(this);
}

WorkerManager.prototype.initWorker = function(name) {
  if (this.workers[name]) {
    return this.workers[name];
  }

  var Worker = null;
  switch(name) {
    case 'repo:future':
      Worker = require('./workers/repo/future');
      break;
    case '':
      break;
    default:
      Worker = require('./workers/worker');
      break;
  }
  var worker = new Worker(this);
  this.add(name, worker);
  return worker.init();
};

WorkerManager.prototype.get = function(name) {
  return this.workers[name];
};

WorkerManager.prototype.add = function(name, worker) {
  if (name in this.workers) {
    throw new Error('The worker is already exists');
  }
  this.workers[name] = worker;
  this.emit('add', worker);
};

WorkerManager.prototype.remove = function(name) {
  if (name in this.workers) {
    var worker = this.workers[name];
    delete this.workers[name];
    this.emit('remove', worker);
  }
};

WorkerManager.prototype.start = function() {
  for (var i = 0; i < this.workers.length; i++) {
    this.workers[i].start();
  }
};

WorkerManager.prototype.stop = function(callback) {
  async.each(this.workers, function(worker, cb) {
    worker.stop(cb);
  }, callback);
};

var _workerManager = null;
Object.defineProperty(WorkerManager, 'instance', {
  get: {
    if (_workerManager === null) {
      _workerManager = new WorkerManager();
    }
    return _workerManager;
  }
});
