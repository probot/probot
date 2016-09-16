let process = require('process');
let http = require('http');
let createHandler = require('github-webhook-handler');
let GitHubApi = require('github');

let webhook = createHandler({path: '/', secret: 'secret'});
let github = new GitHubApi();

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

http.createServer(function (req, res) {
  webhook(req, res, function (err) {
    if (err) {
      console.log('ERROR', err);
      res.statusCode = 500;
      res.end('Something has gone terribly wrong.');
    } else {
      res.statusCode = 404;
      res.end('no such location');
    }
  });
}).listen(process.env.PORT || 3000);

function register(behavior) {
  webhook.on(behavior.webhook, function (event) {
    behavior.action(event, github);
  });
}

register(require('./behaviors/autoresponder.js'));
