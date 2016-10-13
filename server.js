require('dotenv').config();

const process = require('process');
const http = require('http');
const createHandler = require('github-webhook-handler');
const GitHubApi = require('github');
const Configuration = require('./lib/configuration');
const Dispatcher = require('./lib/dispatcher');
const installations = require('./lib/installations');

const PORT = process.env.PORT || 3000;
const webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'development'});

// Cache installations
installations.load();
// Listen for new installations
installations.listen(webhook);

const github = new GitHubApi({
  debug: true
});

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
    const installation = installations.for(event.payload.repository.owner.login);
    installations.authAs(installation).then(github => {
      const dispatcher = new Dispatcher(github, event);
      return Configuration.load(github, event.payload.repository).then(config => {
        dispatcher.call(config);
      });
    });
  }
});

console.log('Listening on http://localhost:' + PORT);
