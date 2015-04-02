var mongodb = require('mongodb')
  , elasticsearch = require('elasticsearch')
  , tokens = require('./lib/tokens')
  , GithubApi = require('./lib/github_api')
  , Db = require('./lib/db')
  , Spider = require('./lib/spider')
  , config = require('./config.json');

var tokenManager = new tokens.TokenManager();
tokenManager.init(config.tokens);

var es = new elasticsearch.Client(config.elasticsearch);
var githubApi = new GithubApi(tokenManager);

var app = {
  config: config,
  tokenManager: tokenManager,
  es: es,
  githubApi: githubApi
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
