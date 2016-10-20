require('dotenv').config({silent: true});

const process = require('process');
const http = require('http');
const createHandler = require('github-webhook-handler');
const debug = require('debug')('PRobot');
const GitHubApi = require('github');
const Configuration = require('./lib/configuration');
const Dispatcher = require('./lib/dispatcher');
const installations = require('./lib/installations');

const PORT = process.env.PORT || 3000;
const webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'development'});

debug('Starting');

// Cache installations
installations.load();
// Listen for new installations
installations.listen(webhook);

http.createServer((req, res) => {
  webhook(req, res, err => {
    if (err) {
      console.error(err);
      res.statusCode = 500;
      res.end('Something has gone terribly wrong.');
    } else {
      res.statusCode = 404;
      res.end('no such location');
    }
  });
}).listen(PORT);

webhook.on('*', event => {
  debug('webhook', event);

  if (event.payload.repository) {
    const account = event.payload.repository.owner.login;
    installations.auth(account).then(github => {
      const dispatcher = new Dispatcher(github, event);
      return Configuration.load(github, event.payload.repository).then(config => {
        dispatcher.call(config);
      });
    });
  }
});

// Show trace for any unhandled rejections
process.on('unhandledRejection', reason => {
  console.error(reason);
});

const github = new GitHubApi({debug: false});

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

// Check for and accept any repository invitations
function checkForInvites() {
  debug('Checking for repository invites');
  github.users.getRepoInvites({}).then(invites => {
    invites.forEach(invite => {
      debug('Accepting repository invite', invite.full_name);
      github.users.acceptRepoInvite(invite);
    });
  });

  debug('Checking for organization invites');
  github.orgs.getOrganizationMemberships({state: 'pending'}).then(invites => {
    invites.forEach(invite => {
      debug('Accepting organization invite', invite.organization.login);
      github.users.editOrganizationMembership({
        org: invite.organization.login,
        state: 'active'
      });
    });
  });
}
checkForInvites();
setInterval(checkForInvites, Number(process.env.INVITE_CHECK_INTERVAL || 60) * 1000);

console.log('Listening on http://localhost:' + PORT);
