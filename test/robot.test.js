const {Context} = require('../src/context')
const {createRobot} = require('../src/robot')
const {logger} = require('../src/logger')

describe('Robot', function () {
  let robot
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

    robot = createRobot({})
    robot.auth = jest.fn().mockReturnValue({})

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
      const handler = jest.fn().mockImplementation(context => {
        expect(context.log).toBeDefined()
        context.log('testing')

        expect(output[0]).toEqual(expect.objectContaining({
          msg: 'testing',
          id: context.id
        }))
      })

      robot.on('test', handler)
      await robot.receive(event)
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

      robot.on('installation.created', async context => {
        // no-op
      })

      await robot.receive(event)

      expect(robot.auth).toHaveBeenCalledWith(1, expect.anything())
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

      robot.on('installation.deleted', async context => {
        // no-op
      })

      await robot.receive(event)

      expect(robot.auth).toHaveBeenCalledWith()
    })

    it('returns an authenticated client for events without an installation', async () => {
      const event = {
        id: '123-456',
        event: 'foobar',
        payload: { /* no installation */ }
      }

      robot.on('foobar', async context => {
        // no-op
      })

      await robot.receive(event)

      expect(robot.auth).toHaveBeenCalledWith()
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

      expect(output.length).toBe(1)
      expect(output[0].err.message).toEqual('testing')
      expect(output[0].event.id).toEqual(event.id)
    })

    it('logs errors from rejected promises', async () => {
      robot.on('test', () => Promise.reject(error))

      try {
        await robot.receive(event)
      } catch (err) {
        // Expected
      }

      expect(output.length).toBe(1)
      expect(output[0].err.message).toEqual('testing')
      expect(output[0].event.id).toEqual(event.id)
    })
  })
})
