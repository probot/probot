const {Context} = require('../src/context')
const {Application} = require('../src/application')
const {logger} = require('../src/logger')

describe('Application', function () {
  let app
  let event
  let output

  beforeAll(() => {
    // Add a new stream for testing the logger
    // https://github.com/trentm/node-bunyan#adding-a-stream
    logger.addStream({
      level: 'trace',
      type: 'raw',
      stream: {write: log => output.push(log)}
    })
  })

  beforeEach(function () {
    // Clear log output
    output = []

    app = new Application({})
    app.auth = jest.fn().mockReturnValue({})

    event = {
      id: '123-456',
      event: 'test',
      payload: {
        action: 'foo',
        installation: {id: 1}
      }
    }
  })

  describe('on', function () {
    it('calls callback when no action is specified', async function () {
      const spy = jest.fn()
      app.on('test', spy)

      expect(spy).toHaveBeenCalledTimes(0)
      await app.receive(event)
      expect(spy).toHaveBeenCalled()
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Context)
      expect(spy.mock.calls[0][0].payload).toBe(event.payload)
    })

    it('calls callback with same action', async function () {
      const spy = jest.fn()
      app.on('test.foo', spy)

      await app.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('does not call callback with different action', async function () {
      const spy = jest.fn()
      app.on('test.nope', spy)

      await app.receive(event)
      expect(spy).toHaveBeenCalledTimes(0)
    })

    it('calls callback with *', async function () {
      const spy = jest.fn()
      app.on('*', spy)

      await app.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('calls callback x amount of times when an array of x actions is passed', async function () {
      const event2 = {
        event: 'arrayTest',
        payload: {
          action: 'bar',
          installation: {id: 2}
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
          msg: 'testing',
          id: context.id
        }))
      })

      app.on('test', handler)
      await app.receive(event)
      expect(handler).toHaveBeenCalled()
    })

    it('returns an authenticated client for installation.created', async () => {
      const event = {
        id: '123-456',
        event: 'installation',
        payload: {
          action: 'created',
          installation: {id: 1}
        }
      }

      app.on('installation.created', async context => {
        // no-op
      })

      await app.receive(event)

      expect(app.auth).toHaveBeenCalledWith(1, expect.anything())
    })

    it('returns an unauthenticated client for installation.deleted', async () => {
      const event = {
        id: '123-456',
        event: 'installation',
        payload: {
          action: 'deleted',
          installation: {id: 1}
        }
      }

      app.on('installation.deleted', async context => {
        // no-op
      })

      await app.receive(event)

      expect(app.auth).toHaveBeenCalledWith()
    })

    it('returns an authenticated client for events without an installation', async () => {
      const event = {
        id: '123-456',
        event: 'foobar',
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
      const myApp = a => a.on('test', spy)

      app.load(myApp)
      await app.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('loads multiple apps', async () => {
      const spy = jest.fn()
      const spy2 = jest.fn()
      const myApp = a => a.on('test', spy)
      const myApp2 = a => a.on('test', spy2)

      app.load([myApp, myApp2])
      await app.receive(event)
      expect(spy).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    let error

    beforeEach(() => {
      error = new Error('testing')
      app.log.error = jest.fn()
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
})
