const Context = require('../lib/context')
const createRobot = require('../lib/robot')

describe('Robot', function () {
  let robot
  let event

  beforeEach(function () {
    robot = createRobot()
    robot.auth = () => {}

    event = {
      event: 'test',
      payload: {
        action: 'foo',
        installation: {id: 1}
      }
    }
  })

  describe('constructor', () => {
    it('takes a logger', () => {
      const logger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
      }
      robot = createRobot({logger})

      robot.log('hello world')
      expect(logger.debug).toHaveBeenCalledWith('hello world')
    })
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
  })
})
