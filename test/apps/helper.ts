// FIXME: move this to a test helper that can be used by other apps

import cacheManager from 'cache-manager'
import { Application, ApplicationFunction } from '../../src'

const cache = cacheManager.caching({ store: 'memory', ttl: 0 })

const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY
Fl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo
/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY
wQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv
A1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq
NKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U
r1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=
-----END RSA PRIVATE KEY-----`

export function newApp (): Application {
  return new Application({ 
    id: 1,
    cert: PRIVATE_KEY,
    app: {
      getInstallationAccessToken: jest.fn().mockResolvedValue('test'),
      getSignedJsonWebToken: jest.fn().mockReturnValue('test')
    },
    cache
  })
}

export function createApp (appFn?: ApplicationFunction) {
  const app = newApp()
  appFn && appFn(app)
  return app
}
