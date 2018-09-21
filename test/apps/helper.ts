// FIXME: move this to a test helper that can be used by other apps

import cacheManager from 'cache-manager'
import { Application, ApplicationFunction } from '../../src'

const cache = cacheManager.caching({ store: 'memory', ttl: 0 })

const jwt = jest.fn().mockReturnValue('test')

export function newApp (): Application {
  return new Application({ app: jwt, cache })
}

export function createApp (appFn?: ApplicationFunction) {
  const app = newApp()
  appFn && appFn(app)
  return app
}
