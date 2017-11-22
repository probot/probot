const Context = require('../lib/context')
const createRobot = require('../lib/robot')
const logger = require('../lib/logger')

describe('Robot', function () {
  let robot
  let event

  beforeEach(function () {
    robot = createRobot()
    robot.auth = () => {}

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
      robot.on('test', spy)

      expect(spy).toHaveBeenCalledTimes(0)
      await robot.receive(event)
      expect(spy).toHaveBeenCalled()
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Context)
      expect(spy.mock.calls[0][0].payload).toBe(event.payload)
    })

    it('calls callback with same action', async function () {
      const spy = jest.fn()
      robot.on('test.foo', spy)

      await robot.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('does not call callback with different action', async function () {
      const spy = jest.fn()
      robot.on('test.nope', spy)

      await robot.receive(event)
      expect(spy).toHaveBeenCalledTimes(0)
    })

    it('calls callback with *', async function () {
      const spy = jest.fn()
      robot.on('*', spy)

      await robot.receive(event)
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
      robot.on(['test.foo', 'arrayTest.bar'], spy)

      await robot.receive(event)
      await robot.receive(event2)
      expect(spy.mock.calls.length).toEqual(2)
    })

    it('adds a logger on the context', async () => {
      // Add a new stream for testing the logginer
      // https://github.com/trentm/node-bunyan#adding-a-stream
      const output = []
      logger.addStream({
        level: 'trace',
        type: 'raw',
        stream: {write: log => output.push(log)}
      })

      const handler = jest.fn(context => {
        expect(context.log).toBeDefined()
        context.log('testing')

        expect(output[0]).toEqual(expect.objectContaining({
          msg: 'testing',
          event: expect.objectContaining({
            id: context.id,
            installation: event.payload.installation.id
          })
        }))
      })

      robot.on('test', handler)
      await robot.receive(event)
      expect(handler).toHaveBeenCalled()
    })

    it('allows middleware', async () => {
      const fakeMiddleware = jest.fn((context, next) => next())
      const spy = jest.fn()
      robot.on('test', fakeMiddleware, spy)

      await robot.receive(event)
      expect(fakeMiddleware).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })

    it('allows multiple middleware', async () => {
      const fakeMiddleware = jest.fn((context, next) => next())
      const fakeMiddlewareTwo = jest.fn((context, next) => next())
      const spy = jest.fn()
      robot.on('test', fakeMiddleware, fakeMiddlewareTwo, spy)

      await robot.receive(event)
      expect(fakeMiddleware).toHaveBeenCalled()
      expect(fakeMiddlewareTwo).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })

    it('exits the chain when done() is called', async () => {
      const fakeMiddleware = jest.fn((context, next, done) => done())
      const fakeMiddlewareTwo = jest.fn()
      const spy = jest.fn()
      robot.on('test', fakeMiddleware, fakeMiddlewareTwo, spy)

      await robot.receive(event)
      expect(fakeMiddleware).toHaveBeenCalled()
      // expect(fakeMiddlewareTwo).not.toHaveBeenCalled()
      expect(spy).not.toHaveBeenCalled()
    })

    it('allow middleware to modify the context object', async () => {
      const fakeMiddleware = jest.fn((context, next) => {
        context.pizza = true
        next(null, context)
      })
      const spy = jest.fn()
      robot.on('test', fakeMiddleware, spy)

      await robot.receive(event)
      expect(fakeMiddleware).toHaveBeenCalled()
      expect(spy.mock.calls[0][0].pizza).toBeTruthy()
    })
  })

  describe('receive', () => {
    it('delivers the event', async () => {
      const spy = jest.fn()
      robot.on('test', spy)

      await robot.receive(event)

      expect(spy).toHaveBeenCalled()
    })

    it('waits for async events to resolve', async () => {
      const spy = jest.fn()

      robot.on('test', () => {
        return new Promise(resolve => {
          setTimeout(() => {
            spy()
            resolve()
          }, 1)
        })
      })

      await robot.receive(event)

      expect(spy).toHaveBeenCalled()
    })

    it('returns a reject errors thrown in apps', async () => {
      robot.on('test', () => {
        throw new Error('error from app')
      })

      try {
        await robot.receive(event)
        throw new Error('expected error to be raised from app')
      } catch (err) {
        expect(err.message).toEqual('error from app')
      }
    })
  })

  describe('error handling', () => {
    let error

    beforeEach(() => {
      error = new Error('testing')
      robot.log.error = jest.fn()
    })

    it('logs errors thrown from handlers', async () => {
      robot.on('test', () => {
        throw error
      })

      try {
        await robot.receive(event)
      } catch (err) {
        // Expected
      }

      const arg = robot.log.error.mock.calls[0][0]
      expect(arg.err).toBe(error)
      expect(arg.event).toBe(event)
    })

    it('logs errors from rejected promises', async () => {
      robot.on('test', () => Promise.reject(error))

      try {
        await robot.receive(event)
      } catch (err) {
        // Expected
      }

      expect(robot.log.error).toHaveBeenCalled()
      const arg = robot.log.error.mock.calls[0][0]
      expect(arg.err).toBe(error)
      expect(arg.event).toBe(event)
    })

    it('does not call the callback if a middleware sends an error', async () => {
      const fakeMiddleware = jest.fn((context, next) => {
        next(error)
      })

      const spy = jest.fn()
      robot.on('test', fakeMiddleware, spy)

      try {
        await robot.receive(event)
      } catch (err) {
        // Expected
      }

      expect(robot.log.error).toHaveBeenCalled()
      expect(fakeMiddleware).toHaveBeenCalled()
      const arg = robot.log.error.mock.calls[0][0]
      expect(arg.err).toBe(error)
      expect(arg.event).toBe(event)
    })

    it('does not call the callback if a middleware throws', async () => {
      const fakeMiddleware = jest.fn(() => Promise.reject(error))

      const spy = jest.fn()
      robot.on('test', fakeMiddleware, spy)

      try {
        await robot.receive(event)
      } catch (err) {
        // Expected
      }

      expect(robot.log.error).toHaveBeenCalled()
      expect(fakeMiddleware).toHaveBeenCalled()
      const arg = robot.log.error.mock.calls[0][0]
      expect(arg.err).toBe(error)
      expect(arg.event).toBe(event)
    })
  })
})
