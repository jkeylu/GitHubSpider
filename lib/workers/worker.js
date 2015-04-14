var util = require('util')
  , EventEmitter = require('events').EventEmitter;

util.inherits(Worker, EventEmitter);
module.exports = Worker;

function Worker(name, workerManager) {
  this.name = name;

  if (!workerManager.db) {
    throw new Error('Worker db is not set');
  }
  this.db = workerManager.db;
  this.workerManager = workerManager;

  EventEmitter.call(this);
}

Worker.prototype.init = function() {
  throw new Error('Worker.init is not implemented');
};

Worker.prototype.initIfExists = function(name, callback) {
  var workerManager = this.workerManager;

  var worker = workerManager.get(name);
  if (worker) {
    callback(worker);
    return;
  }

  workerManager.on('add', onWorkerAdded);

  function onWorkerAdded(worker) {
    if (worker.name == name) {
      workerManager.removeListener('add', onWorkerAdded);
      callback(worker);
    }
  };
};

Worker.prototype.start = function() {
  throw new Error('Worker.start is not implemented');
};

Worker.prototype.stop = function(callback) {
  callback();
};
