var MongoClient = require('mongodb').MongoClient
  , Db = require('./db');

var mongodbUri = 'mongodb://localhost/gitstars';
MongoClient.connect(mongodbUri, function(err, database) {
  if (err) {
    console.error(err);
    process.exit(1);
    return;
  }

  var db = new Db(database);
  var githubApi = null;

  // repo:future,repo:detail
  if (process.argv.length > 2) {

  } else {
  }
});

function initWorker(name) {
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
  var worker = new Worker();
  return worker;
}
