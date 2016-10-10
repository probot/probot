const process = require('process');
const http = require('http');
const createHandler = require('github-webhook-handler');
const GitHubApi = require('github');
const Configuration = require('./lib/configuration');
const Dispatcher = require('./lib/dispatcher');

const PORT = process.env.PORT || 3000;
const webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'secret'});

const github = new GitHubApi();
github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

http.createServer((req, res) => {
  webhook(req, res, err => {
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

webhook.on('*', event => {
  if (event.payload.repository) {
    const dispatcher = new Dispatcher(github, event);
    return Configuration.load(github, event.payload.repository).then(
      config => dispatcher.call(config)
    );
  }
});

console.log('Listening on http://localhost:' + PORT);
