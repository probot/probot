// FIXME: move this to a test helper that can be used by other apps

import { Application, ApplicationFunction, GitHubApp } from '../../src'

export function newApp (): Application {
  const adapter = new GitHubApp(1, 'test')
  adapter.jwt = jest.fn().mockReturnValue('test')
  return new Application({ adapter })
}

export function createApp (appFn?: ApplicationFunction) {
  const app = newApp()
  appFn && appFn(app)
  return app
}
