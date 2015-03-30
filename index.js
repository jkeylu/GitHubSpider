var mongodb = require('mongodb')
  , tokens = require('./lib/tokens')
  , Spider = require('./lib/spider')
  , config = require('./config.json');

mongodb.MongoClient.connect(config.mongodbUrl, function(err, db) {
  var app = {
    db: db,
    config: config
  };

  tokens.manager.init(app.config.tokens);

  var spider = new Spider(app);
  spider.run();
});
