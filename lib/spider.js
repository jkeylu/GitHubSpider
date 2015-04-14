var MongoClient = require('mongodb').MongoClient
  , Db = require('./db')
  , workerManager = require('./workers/worker_manager').instance;

var mongodbUri = 'mongodb://localhost/gitstars';
MongoClient.connect(mongodbUri, function(err, database) {
  if (err) {
    console.error(err);
    process.exit(1);
    return;
  }

  workerManager.db = new Db(database);

  // repo:future,repo:detail
  if (process.argv.length > 2) {

  } else {
  }
});
