// FIXME: move this to a test helper that can be used by other apps

import cacheManager from 'cache-manager'
import { Application } from '../../src'

const cache = cacheManager.caching({ store: 'memory', ttl: 0 })

const jwt = jest.fn().mockReturnValue('test')

export = {
  createApp (appFn = () => undefined) {
    const app = new Application({ app: jwt, cache })
    app.load(appFn)
    return app
  }
}
