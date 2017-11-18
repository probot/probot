const jwt = require('jsonwebtoken')
const GitHubApi = require('github')

module.exports = function ({id, cert, debug = false}) {
  function asApp () {
    const github = new GitHubApi({debug})
    github.authenticate({type: 'integration', token: generateJwt(id, cert)})
    // Return a promise to keep API consistent
    return Promise.resolve(github)
  }

  // Authenticate as the given installation
  function asInstallation (installationId) {
    return createToken(installationId).then(res => {
      const github = new GitHubApi({debug})
      github.authenticate({type: 'token', token: res.data.token})
      return github
    })
  }

  // https://developer.github.com/early-access/integrations/authentication/#as-an-installation
  function createToken (installationId) {
    return asApp().then(github => {
      return github.apps.createInstallationToken({
        installation_id: installationId
      })
    })
  }

  // Internal - no need to expose this right now
  function generateJwt (id, cert) {
    const payload = {
      iat: Math.floor(new Date() / 1000),       // Issued at time
      exp: Math.floor(new Date() / 1000) + 60,  // JWT expiration time
      iss: id                                   // Integration's GitHub id
    }

    // Sign with RSA SHA256
    return jwt.sign(payload, cert, {algorithm: 'RS256'})
  }

  return {asApp, asInstallation, createToken}
}
