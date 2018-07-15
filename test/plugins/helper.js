// FIXME: move this to a test helper that can be used by other apps

const {Application} = require('../../src')
const {GitHubApp} = require('../../src/github-app')

module.exports = {
  createApp (plugin = () => {}) {
    const github = new GitHubApp(1, 'test')
    github.jwt = jest.fn().mockReturnValue('test')
    const app = new Application({github})
    app.load(plugin)
    return app
  }
}
