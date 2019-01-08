 import { WebhookEvent } from '@octokit/webhooks'
import cacheManager from 'cache-manager'
import nock from 'nock'

import { Application } from '../src/application'
import { Context } from '../src/context'
import { logger } from '../src/logger'

describe('Application', () => {
  let app: Application
  let event: WebhookEvent
  let output: any

  beforeAll(() => {
    // Add a new stream for testing the logger
    // https://github.com/trentm/node-bunyan#adding-a-stream
    logger.addStream({
      level: 'trace',
      stream: { write: (log: any) => output.push(log) },
      type: 'raw'
    } as any)
  })

  beforeEach(() => {
    // Clear log output
    output = []

    app = new Application({} as any)
    app.auth = jest.fn().mockReturnValue({})

    event = {
      id: '123-456',
      name: 'test',
      payload: {
        action: 'foo',
        installation: { id: 1 }
      }
    }
  })

  describe('on', () => {
    it('calls callback when no action is specified', async () => {
      const spy = jest.fn()
      app.on('test', spy)

      expect(spy).toHaveBeenCalledTimes(0)
      await app.receive(event)
      expect(spy).toHaveBeenCalled()
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Context)
      expect(spy.mock.calls[0][0].payload).toBe(event.payload)
    })

    it('calls callback with same action', async () => {
      const spy = jest.fn()
      app.on('test.foo', spy)

      await app.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('does not call callback with different action', async () => {
      const spy = jest.fn()
      app.on('test.nope', spy)

      await app.receive(event)
      expect(spy).toHaveBeenCalledTimes(0)
    })

    it('calls callback with *', async () => {
      const spy = jest.fn()
      app.on('*', spy)

      await app.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('calls callback x amount of times when an array of x actions is passed', async () => {
      const event2: WebhookEvent = {
        id: '123',
        name: 'arrayTest',
        payload: {
          action: 'bar',
          installation: { id: 2 }
        }
      }

      const spy = jest.fn()
      app.on(['test.foo', 'arrayTest.bar'], spy)

      await app.receive(event)
      await app.receive(event2)
      expect(spy.mock.calls.length).toEqual(2)
    })

    it('adds a logger on the context', async () => {
      const handler = jest.fn().mockImplementation(context => {
        expect(context.log).toBeDefined()
        context.log('testing')

        expect(output[0]).toEqual(expect.objectContaining({
          id: context.id,
          msg: 'testing'
        }))
      })

      app.on('test', handler)
      await app.receive(event)
      expect(handler).toHaveBeenCalled()
    })

    it('returns an authenticated client for installation.created', async () => {
      event = {
        id: '123-456',
        name: 'installation',
        payload: {
          action: 'created',
          installation: { id: 1 }
        }
      }

      app.on('installation.created', async context => {
        // no-op
      })

      await app.receive(event)

      expect(app.auth).toHaveBeenCalledWith(1, expect.anything())
    })

    it('returns an unauthenticated client for installation.deleted', async () => {
      event = {
        id: '123-456',
        name: 'installation',
        payload: {
          action: 'deleted',
          installation: { id: 1 }
        }
      }

      app.on('installation.deleted', async context => {
        // no-op
      })

      await app.receive(event)

      expect(app.auth).toHaveBeenCalledWith()
    })

    it('returns an authenticated client for events without an installation', async () => {
      event = {
        id: '123-456',
        name: 'foobar',
        payload: { /* no installation */ }
      }

      app.on('foobar', async context => {
        // no-op
      })

      await app.receive(event)

      expect(app.auth).toHaveBeenCalledWith()
    })
  })

  describe('receive', () => {
    it('delivers the event', async () => {
      const spy = jest.fn()
      app.on('test', spy)

      await app.receive(event)

      expect(spy).toHaveBeenCalled()
    })

    it('waits for async events to resolve', async () => {
      const spy = jest.fn()

      app.on('test', () => {
        return new Promise(resolve => {
          setTimeout(() => {
            spy()
            resolve()
          }, 1)
        })
      })

      await app.receive(event)

      expect(spy).toHaveBeenCalled()
    })

    it('returns a reject errors thrown in apps', async () => {
      app.on('test', () => {
        throw new Error('error from app')
      })

      try {
        await app.receive(event)
        throw new Error('expected error to be raised from app')
      } catch (err) {
        expect(err.message).toEqual('error from app')
      }
    })
  })

  describe('load', () => {
    it('loads one app', async () => {
      const spy = jest.fn()
      const myApp = (a: any) => a.on('test', spy)

      app.load(myApp)
      await app.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('loads multiple apps', async () => {
      const spy = jest.fn()
      const spy2 = jest.fn()
      const myApp = (a: any) => a.on('test', spy)
      const myApp2 = (a: any) => a.on('test', spy2)

      app.load([myApp, myApp2])
      await app.receive(event)
      expect(spy).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    let error: any

    beforeEach(() => {
      error = new Error('testing')
      app.log.error = jest.fn() as any
    })

    it('logs errors thrown from handlers', async () => {
      app.on('test', () => {
        throw error
      })

      try {
        await app.receive(event)
      } catch (err) {
        // Expected
      }

      expect(output.length).toBe(1)
      expect(output[0].err.message).toEqual('testing')
      expect(output[0].event.id).toEqual(event.id)
    })

    it('logs errors from rejected promises', async () => {
      app.on('test', () => Promise.reject(error))

      try {
        await app.receive(event)
      } catch (err) {
        // Expected
      }

      expect(output.length).toBe(1)
      expect(output[0].err.message).toEqual('testing')
      expect(output[0].event.id).toEqual(event.id)
    })
  })

  describe('deprecations', () => {
    let consoleWarnSpy: any
    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(global.console, 'warn').mockImplementation(() => null)
    })
    afterEach(() => {
      consoleWarnSpy.mockReset()
    })
    test('receive() accepts param with {event}', async () => {
      const spy = jest.fn()
      app.events.on('deprecated', spy)
      await app.receive({ event: 'deprecated', payload: { action: 'test' } } as any)
      expect(spy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    test('receive() accepts param with {name,event}', async () => {
      const spy = jest.fn()
      app.events.on('real-event-name', spy)
      await app.receive({ name: 'real-event-name', event: 'deprecated', payload: { action: 'test' } } as any)
      expect(spy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('auth cache', () => {
    let scopeInstall: nock.Scope
    let scopeData: nock.Scope

    const cleanGlobals = () => {
      delete process.env.INSTALLATION_TOKEN_TTL
      nock.cleanAll()
    }

    beforeEach(() => {
      cleanGlobals()

      const cache = cacheManager.caching({
        store: 'memory',
        ttl: 60 * 60 // 1 hour
      })
      app = new Application({ cache } as any)
      app.app = () => 'app-bearer-authorization-token'

      scopeInstall = nock('https://api.github.com')
        .post('/app/installations/1/access_tokens')
        .reply(200, { token: 'installation-bearer-authorization-token' })
      scopeData = nock('https://api.github.com')
        .matchHeader('authorization', 'token installation-bearer-authorization-token')
        .get('/orgs/myorg')
        .reply(200, {})
    })

    afterEach(() => {
      expect(scopeInstall.isDone()).toEqual(true)
      expect(scopeData.isDone()).toEqual(true)

      cleanGlobals()
    })

    it('requests an installation token once for one event', async () => {
      // Receive first event
      app.on('test.foo', async context => {
        await context.github.orgs.get({ org: 'myorg' })
      })

      await app.receive(event)
    })

    it('requests an installation token once for two events', async () => {
      // Receive first event
      app.on('test.foo', async context => {
        await context.github.orgs.get({ org: 'myorg' })
      })
      await app.receive(event)

      // Receive second event
      const scopeInstallTwo = nock('https://api.github.com')
        .post('/app/installations/1/access_tokens')
          .reply(200, { token: 'token-should-not-be-requested' })
      const scopeDataTwo = nock('https://api.github.com')
        .matchHeader('authorization', 'token installation-bearer-authorization-token')
        .get('/orgs/myorg')
          .reply(200, {})
      await app.receive(event)

      // we should have not requested a second token, and just used the first one
      expect(scopeInstallTwo.isDone()).toEqual(false)
      expect(scopeDataTwo.isDone()).toEqual(true)
    })

    it('requests an installation token once for each event if not cached', async () => {
      // Only cache token for 1 second
      process.env.INSTALLATION_TOKEN_TTL = '1'

      // Receive first event
      app.on('test.foo', async context => {
        await context.github.orgs.get({ org: 'myorg' })
      })
      await app.receive(event)

      // Sleep longer than ttl value to let token cache expire
      const sleep = async () => new Promise(resolve => setTimeout(resolve, 1200))
      await sleep()

      // Receive second event
      const scopeInstallTwo = nock('https://api.github.com')
        .post('/app/installations/1/access_tokens')
          .reply(200, { token: 'second-installation-token' })
      const scopeDataTwo = nock('https://api.github.com')
        .matchHeader('authorization', 'token second-installation-token')
        .get('/orgs/myorg')
          .reply(200, {})
      await app.receive(event)

      // our second token should have been requested and used
      expect(scopeInstallTwo.isDone()).toEqual(true)
      expect(scopeDataTwo.isDone()).toEqual(true)
    })
  })
})
