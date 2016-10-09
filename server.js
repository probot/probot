let process = require('process');
let http = require('http');
let createHandler = require('github-webhook-handler');
let GitHubApi = require('github');

let webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'secret'});
let github = new GitHubApi();
let dispatch = require('./lib/dispatch');

let PORT = process.env.PORT || 3000;

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
}).listen(PORT);

console.log("Listening on http://localhost:" + PORT);

function register(behavior) {
  webhook.on(behavior.webhook, function (event) {
    behavior.action(event, github);
  });
}

webhook.on('*', function (event) {
  dispatch(github, event);
});

register(require('./behaviors/autoresponder.js'));
