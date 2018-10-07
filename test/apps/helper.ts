// FIXME: move this to a test helper that can be used by other apps

import { Application, ApplicationFunction } from '../../src'
import { GitHubApp } from '../../src/github-app'

export function newApp (): Application {
  const github = new GitHubApp(1, 'test')
  github.jwt = jest.fn().mockReturnValue('test')
  return new Application({ github })
}

export function createApp (appFn?: ApplicationFunction) {
  const app = newApp()
  appFn && appFn(app)
  return app
}
