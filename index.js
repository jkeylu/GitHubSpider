var mongodb = require('mongodb')
  , elasticsearch = require('elasticsearch')
  , needle = require('needle')
  , tokens = require('./lib/tokens')
  , GithubApi = require('./lib/github_api')
  , Db = require('./lib/db')
  , Spider = require('./lib/spider')
  , config = require('./config.json')
  , package = require('./package.json');

var userAgent = package.name + '/' + package.version;
needle.defaults({
  accept: 'application/vnd.github.v3+json',
  user_agent: userAgent
});

var tokenManager = new tokens.TokenManager();
tokenManager.init(config.tokens);

var githubApi = new GithubApi(tokenManager);

var app = {
  config: config,
  tokenManager: tokenManager,
  githubApi: githubApi
};

if (app.config.runElasticsearchWorker) {
  app.es = new elasticsearch.Client(config.elasticsearch);
}

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
