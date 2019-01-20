// FIXME: move this to a test helper that can be used by other apps

import cacheManager from 'cache-manager'
import { Application, ApplicationFunction } from '../../src'

const cache = cacheManager.caching({ store: 'memory', ttl: 0 })

export function newApp (): Application {
  return new Application({ app: {
    getInstallationAccessToken: jest.fn().mockResolvedValue('test'),
    getSignedJsonWebToken: jest.fn().mockReturnValue('test')
  }, cache })
}

export function createApp (appFn?: ApplicationFunction) {
  const app = newApp()
  appFn && appFn(app)
  return app
}
