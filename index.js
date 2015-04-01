var mongodb = require('mongodb')
  , tokens = require('./lib/tokens')
  , Db = require('./lib/db')
  , Spider = require('./lib/spider')
  , config = require('./config.json');

var tokenManager = new tokens.TokenManager();
tokenManager.init(config.tokens);

var app = {
  config: config,
  tokenManager: tokenManager
};

mongodb.MongoClient.connect(config.mongodbUrl, function(err, database) {
  if (err) {
    console.error(err);
    process.exit(1);
    return;
  }

  app.db = new Db(database);

  app.spider = new Spider(app);
  app.spider.init().run();
});
