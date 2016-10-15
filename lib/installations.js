const debug = require('debug')('PRobot');
const GitHubApi = require('github');
const jwt = require('./jwt');

module.exports = {load, listen, auth};

const installations = {};
const tokens = {};

// Load all the installations for the integration.
function load() {
  const github = new GitHubApi();
  github.authenticate({type: 'integration', token: jwt()});

  debug('Loading installations');

  // Get all installations. Eventually loading all installations on startup
  // will not scale, but it will work until persistence is figured out.
  // FIXME: handle pagination
  return github.integrations.getInstallations({per_page: 100}).then(
    data => data.forEach(register)
  );
}

// listen for installations or uninstallations
function listen(webhook) {
  webhook.on('integration_installation', event => {
    if (event.payload.action === 'create') {
      register(event.payload.installation);
    } else if (event.payload.action === 'deleted') {
      unregister(event.payload.installation);
    }
  });
}

// Authenticate as an installation for the given account
function auth(account) {
  const installation = installations[account];
  const token = tokens[installation.id];
  let result;

  if (!token || new Date(token.expires_at) < new Date()) {
    result = createToken(installation);
  } else {
    const github = new GitHubApi();
    github.authenticate({type: 'token', token: token.token});
    result = Promise.resolve(github);
  }

  return result;
}

function register(installation) {
  debug('registering installation', installation);
  installations[installation.account.login] = installation;
}

function unregister(installation) {
  debug('unregistering installation', installation);
  delete installations[installation.account.login];
  delete tokens[installation.id];
}

// https://developer.github.com/early-access/integrations/authentication/#as-an-installation
function createToken(installation) {
  const github = new GitHubApi();
  github.authenticate({type: 'integration', token: jwt()});

  debug('creating token for installation', installation);

  return github.integrations.createInstallationToken({
    installation_id: installation.id
  }).then(token => {
    // cache token
    tokens[installation.id] = token;

    github.authenticate({type: 'token', token: token.token});
    return github;
  });
}
