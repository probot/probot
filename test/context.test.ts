import fs = require('fs')
import path = require('path')

import Webhooks from '@octokit/webhooks'
import { Context, MergeOptions } from '../src/context'
import { GitHubAPI, OctokitError } from '../src/github'

import { createMockResponse } from './fixtures/octokit/mock-response'

describe('Context', () => {
  let event: Webhooks.WebhookEvent<any>
  let context: Context
  const notFoundError: OctokitError = {
    message: 'An error occurred',
    name: 'OctokitError',
    status: 404
  }

  beforeEach(() => {
    event = {
      id: '123',
      name: 'push',
      payload: {
        issue: { number: 4 },
        repository: {
          name: 'probot',
          owner: { login: 'bkeepers' }
        }
      }
    }

    context = new Context(event, {} as any, {} as any)
  })

  it('inherits the payload', () => {
    expect(context.payload).toBe(event.payload)
  })

  it('aliases the event name', () => {
    expect(context.name).toEqual('push')
    expect(context.event).toEqual('push')
  })

  describe('repo', () => {
    it('returns attributes from repository payload', () => {
      expect(context.repo()).toEqual({ owner: 'bkeepers', repo: 'probot' })
    })

    it('merges attributes', () => {
      expect(context.repo({ foo: 1, bar: 2 })).toEqual({
        bar: 2, foo: 1, owner: 'bkeepers', repo: 'probot'
      })
    })

    it('overrides repo attributes', () => {
      expect(context.repo({ owner: 'muahaha' })).toEqual({
        owner: 'muahaha', repo: 'probot'
      })
    })

    // The `repository` object on the push event has a different format than the other events
    // https://developer.github.com/v3/activity/events/types/#pushevent
    it('properly handles the push event', () => {
      event.payload = require('./fixtures/webhook/push')

      context = new Context(event, {} as any, {} as any)
      expect(context.repo()).toEqual({ owner: 'bkeepers-inc', repo: 'test' })
    })

    it('return error for context.repo() when repository doesn\'t exist', () => {
      delete context.payload.repository
      try {
        context.repo()
      } catch (e) {
        expect(e.message).toMatch('context.repo() is not supported')
      }
    })
  })

  describe('issue', () => {
    it('returns attributes from repository payload', () => {
      expect(context.issue()).toEqual({ owner: 'bkeepers', repo: 'probot', number: 4 })
    })

    it('merges attributes', () => {
      expect(context.issue({ foo: 1, bar: 2 })).toEqual({
        bar: 2, foo: 1, number: 4, owner: 'bkeepers', repo: 'probot'
      })
    })

    it('overrides repo attributes', () => {
      expect(context.issue({ owner: 'muahaha', number: 5 })).toEqual({
        number: 5, owner: 'muahaha', repo: 'probot'
      })
    })
  })

  describe('config', () => {
    let github: GitHubAPI

    function responseFromString (content: string) {
      return createMockResponse({ content: Buffer.from(content).toString('base64') })
    }

    function responseFromConfig (fileName: string) {
      const configPath = path.join(__dirname, 'fixtures', 'config', fileName)
      const content = fs.readFileSync(configPath, { encoding: 'utf8' })
      return responseFromString(content)
    }

    beforeEach(() => {
      github = GitHubAPI()
      context = new Context(event, github, {} as any)
    })

    it('gets a valid configuration', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('basic.yml'))
      const config = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledTimes(1)
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5
      })
    })

    it('returns null when the file and base repository are missing', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(Promise.reject(notFoundError))

      expect(await context.config('test-file.yml')).toBe(null)
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: '.github'
      })
    })

    it('returns the default config when the file and base repository are missing and default config is passed', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(Promise.reject(notFoundError))
      const defaultConfig = {
        bar: 7,
        baz: 11,
        foo: 5
      }
      const contents = await context.config('test-file.yml', defaultConfig)
      expect(contents).toEqual(defaultConfig)
    })

    it('merges the default config', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('basic.yml'))

      const config = await context.config('test-file.yml', { bar: 1, boa: 6 })

      expect(github.repos.getContents).toHaveBeenCalledTimes(1)
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 5
      })
    })

    it('merges a base config', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('boa: 6\nfoo: 0\n_extends: base'))
        .mockReturnValueOnce(responseFromConfig('basic.yml'))

      const config = await context.config('test-file.yml', { bar: 1, boa: 6 })

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'base'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0
      })
    })

    it('merges the base and default config', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('boa: 6\nfoo: 0\n_extends: base'))
        .mockReturnValueOnce(responseFromConfig('basic.yml'))

      const config = await context.config('test-file.yml', { bar: 1, new: true })

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'base'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0,
        new: true
      })
    })

    it('merges a base config from another organization', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('boa: 6\nfoo: 0\n_extends: other/base'))
        .mockReturnValueOnce(responseFromConfig('basic.yml'))

      const config = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'other',
        path: '.github/test-file.yml',
        repo: 'base'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0
      })
    })

    it('merges a base config with a custom path', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('boa: 6\nfoo: 0\n_extends: base:test.yml'))
        .mockReturnValueOnce(responseFromConfig('basic.yml'))

      const config = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: 'test.yml',
        repo: 'base'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0
      })
    })

    it('ignores a missing base config', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('boa: 6\nfoo: 0\n_extends: base'))
        .mockReturnValueOnce(Promise.reject(notFoundError))

      const config = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'base'
      })
      expect(config).toEqual({
        boa: 6,
        foo: 0
      })
    })

    it('throws when the configuration file is malformed', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('malformed.yml'))

      let e
      let contents
      try {
        contents = await context.config('test-file.yml')
      } catch (err) {
        e = err
      }

      expect(contents).toBeUndefined()
      expect(e).toBeDefined()
      expect(e.message).toMatch(/^end of the stream or a document separator/)
    })

    it('throws when loading unsafe yaml', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('evil.yml'))

      let e
      let config
      try {
        config = await context.config('evil.yml')
      } catch (err) {
        e = err
      }

      expect(config).toBeUndefined()
      expect(e).toBeDefined()
      expect(e.message).toMatch(/unknown tag/)
    })

    it('throws on a non-string base', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValue(responseFromString('boa: 6\nfoo: 0\n_extends: { nope }'))

      let e
      let config
      try {
        config = await context.config('test-file.yml')
      } catch (err) {
        e = err
      }

      expect(config).toBeUndefined()
      expect(e).toBeDefined()
      expect(e.message).toMatch(/invalid/i)
    })

    it('throws on an invalid base', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValue(responseFromString('boa: 6\nfoo: 0\n_extends: "nope:"'))

      let e
      let config
      try {
        config = await context.config('test-file.yml')
      } catch (err) {
        e = err
      }

      expect(config).toBeUndefined()
      expect(e).toBeDefined()
      expect(e.message).toMatch(/nope:/)
    })

    it('returns an empty object when the file is empty', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('empty.yml'))

      const contents = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledTimes(1)
      expect(contents).toEqual({})
    })

    it('overwrites default config settings', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('basic.yml'))
      const config = await context.config('test-file.yml', { foo: 10 })

      expect(github.repos.getContents).toHaveBeenCalledTimes(1)
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5
      })
    })

    it('uses default settings to fill in missing options', async () => {
      jest.spyOn(github.repos, 'getContents').mockReturnValue(responseFromConfig('missing.yml'))
      const config = await context.config('test-file.yml', { bar: 7 })

      expect(github.repos.getContents).toHaveBeenCalledTimes(1)
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5
      })
    })

    it('uses the .github directory on a .github repo', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('foo: foo\n_extends: .github'))
        .mockReturnValueOnce(responseFromConfig('basic.yml'))
      const config = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: '.github'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 'foo'
      })
    })

    it('defaults to .github repo if no config found', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(Promise.reject(notFoundError))
        .mockReturnValueOnce(responseFromConfig('basic.yml'))
      const config = await context.config('test-file.yml')

      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: 'probot'
      })
      expect(github.repos.getContents).toHaveBeenCalledWith({
        owner: 'bkeepers',
        path: '.github/test-file.yml',
        repo: '.github'
      })
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5
      })
    })

    it('deep merges the base config', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('obj:\n  foo:\n  - name: master\n_extends: .github'))
        .mockReturnValueOnce(responseFromString('obj:\n  foo:\n  - name: develop'))
      const config = await context.config('test-file.yml')

      expect(config).toEqual({
        obj: {
          foo: [
            { name: 'develop' },
            { name: 'master' }
          ]
        }
      })
    })

    it('accepts deepmerge options', async () => {
      jest.spyOn(github.repos, 'getContents')
        .mockReturnValueOnce(responseFromString('foo:\n  - name: master\n    shouldChange: changed\n_extends: .github'))
        .mockReturnValueOnce(responseFromString('foo:\n  - name: develop\n  - name: master\n    shouldChange: should'))

      const customMerge = jest.fn((_target: any[], _source: any[], _options: MergeOptions | undefined): any[] => [])
      await context.config('test-file.yml', {}, { arrayMerge: customMerge })
      expect(customMerge).toHaveBeenCalled()
    })
  })

  describe('isBot', () => {
    test('returns true if sender is a bot', () => {
      event.payload.sender = { type: 'Bot' }
      context = new Context(event, {} as any, {} as any)

      expect(context.isBot).toBe(true)
    })

    test('returns false if sender is not a bot', () => {
      event.payload.sender = { type: 'User' }
      context = new Context(event, {} as any, {} as any)

      expect(context.isBot).toBe(false)
    })
  })
})
