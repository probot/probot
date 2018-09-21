// FIXME: move this to a test helper that can be used by other apps

const cacheManager = require('cache-manager')
const {Application} = require('../../src')

const cache = cacheManager.caching({store: 'memory'})

const jwt = jest.fn().mockReturnValue('test')

module.exports = {
  createApp (appFn = () => {}) {
    const app = new Application({app: jwt, cache})
    app.load(appFn)
    return app
  }
}
