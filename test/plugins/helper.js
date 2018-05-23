// FIXME: move this to a test helper that can be used by other apps

const {Application} = require('../../src')
const {GitHubAdapter} = require('../../src/adapters/github')

module.exports = {
  createApp (plugin = () => {}) {
    const adapter = new GitHubAdapter({jwt: jest.fn().mockReturnValue('test')})
    const app = new Application({adapter})
    plugin(app)
    return app
  }
}
