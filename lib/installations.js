const GitHubApi = require('github');
const jwt = require('./jwt');
const log = require('./log');

module.exports = {auth};

const tokens = {};
const enableDebug = log.level() <= 10;

// Authenticate as the given installation
function auth(id) {
  const token = tokens[id];

  if (!token || new Date(token.expires_at) < new Date()) {
    return createToken(id);
  } else {
    const github = new GitHubApi({debug: enableDebug});
    github.authenticate({type: 'token', token: token.token});
    return Promise.resolve(github);
  }
}

// https://developer.github.com/early-access/integrations/authentication/#as-an-installation
function createToken(id) {
  const github = new GitHubApi({debug: enableDebug});
  github.authenticate({type: 'integration', token: jwt()});

  log.debug({installation: id}, 'creating token for installation');

  return github.integrations.createInstallationToken({
    installation_id: id
  }).then(token => {
    // cache token
    tokens[id] = token;

    github.authenticate({type: 'token', token: token.token});
    return github;
  });
}
