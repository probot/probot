// FIXME: move this to a test helper that can be used by other apps

import cacheManager from 'cache-manager'
import { Application, ApplicationFunction } from '../../src'

const cache = cacheManager.caching({ store: 'memory', ttl: 0 })

const jwt = jest.fn().mockReturnValue('test')

export function createApp (appFn?: ApplicationFunction) {
  const app = new Application({ app: jwt, cache })
  appFn && app.load(appFn)
  return app
}
