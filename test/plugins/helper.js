// FIXME: move this to a test helper that can be used by other apps

const cacheManager = require('cache-manager')
const GitHubApi = require('github')
const {createRobot} = require('../..')

const cache = cacheManager.caching({store: 'memory'})

module.exports = {
  createRobot () {
    const githubOptions = {
      host: process.env.GHE_URL || 'api.github.com',
      pathPrefix: process.env.GHE_URL ? '/api/v3' : ''
    }

    const app = {
      async asApp () {
        return new GitHubApi(githubOptions)
      },

      async asInstallation () {
        return new GitHubApi(githubOptions)
      },

      async createToken () {
        return {data: {token: 'test'}}
      }
    }

    return createRobot({app, cache})
  }
}
