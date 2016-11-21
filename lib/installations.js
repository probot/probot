const debug = require('debug')('PRobot');
const GitHubApi = require('github');
const jwt = require('./jwt');

module.exports = {auth};

const tokens = {};

// Authenticate as the given installation
function auth(id) {
  const token = tokens[id];

  if (!token || new Date(token.expires_at) < new Date()) {
    return createToken(id);
  } else {
    const github = new GitHubApi();
    github.authenticate({type: 'token', token: token.token});
    return Promise.resolve(github);
  }
}

// https://developer.github.com/early-access/integrations/authentication/#as-an-installation
function createToken(id) {
  const github = new GitHubApi();
  github.authenticate({type: 'integration', token: jwt()});

  debug('creating token for installation', id);

  return github.integrations.createInstallationToken({
    installation_id: id
  }).then(token => {
    // cache token
    tokens[id] = token;

    github.authenticate({type: 'token', token: token.token});
    return github;
  });
}
