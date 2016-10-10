const process = require('process');
const http = require('http');
const createHandler = require('github-webhook-handler');
const GitHubApi = require('github');
const Configuration = require('./lib/configuration');
const Dispatcher = require('./lib/dispatcher');

let PORT = process.env.PORT || 3000;
let webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'secret'});

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
}).listen(PORT);

webhook.on('*', function (event) {
  if (event.payload.repository) {
    const dispatcher = new Dispatcher(github, event);
    return Configuration.load(github, event.payload.repository).then(
      config => dispatcher.call(config)
    );
  }
});

console.log("Listening on http://localhost:" + PORT);
