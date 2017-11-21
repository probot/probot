// FIXME: move this to a test helper that can be used by other apps

const cacheManager = require('cache-manager')
const GitHubApi = require('github')
const {createRobot} = require('../..')

const cache = cacheManager.caching({store: 'memory'})

const app = {
  async asApp () {
    return new GitHubApi()
  },

  async asInstallation () {
    return new GitHubApi()
  },

  async createToken () {
    return {data: {token: 'test'}}
  }
}

module.exports = {
  createRobot () {
    return createRobot({app, cache})
  }
}
