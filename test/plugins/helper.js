// FIXME: move this to a test helper that can be used by other apps

const {Application} = require('../../src')
const {GitHubApp} = require('../../src/github-app')

module.exports = {
  createApp (plugin = () => {}) {
    const adapter = new GitHubApp({})
    adapter.jwt = jest.fn().mockReturnValue('test')
    const app = new Application({adapter})
    plugin(app)
    return app
  }
}
