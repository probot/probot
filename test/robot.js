const expect = require('expect')
const Context = require('../lib/context')
const createRobot = require('../lib/robot')

describe('Robot', function () {
  let robot
  let event
  let spy

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

    spy = expect.createSpy()
  })

  describe('constructor', () => {
    it('takes a logger', () => {
      const logger = {
        trace: expect.createSpy(),
        debug: expect.createSpy(),
        info: expect.createSpy(),
        warn: expect.createSpy(),
        error: expect.createSpy(),
        fatal: expect.createSpy()
      }
      robot = createRobot({logger})

      robot.log('hello world')
      expect(logger.debug).toHaveBeenCalledWith('hello world')
    })
  })

  describe('on', function () {
    it('calls callback when no action is specified', async function () {
      robot.on('test', spy)

      expect(spy).toNotHaveBeenCalled()
      await robot.receive(event)
      expect(spy).toHaveBeenCalled()
      expect(spy.calls[0].arguments[0]).toBeA(Context)
      expect(spy.calls[0].arguments[0].payload).toBe(event.payload)
    })

    it('(context, event) will be removed in 0.10', () => {
      // This test will fail in version 0.10 to remind us to
      // remove the deprecated (context, event)
      const semver = require('semver')
      const pkg = require('../package')
      expect(semver.satisfies(pkg.version, '< 0.10')).toBe(true)
    })

    it('calls callback with same action', async function () {
      robot.on('test.foo', spy)

      await robot.receive(event)
      expect(spy).toHaveBeenCalled()
    })

    it('does not call callback with different action', async function () {
      robot.on('test.nope', spy)

      await robot.receive(event)
      expect(spy).toNotHaveBeenCalled()
    })

    it('calls callback with *', async function () {
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

      robot.on(['test.foo', 'arrayTest.bar'], spy)

      await robot.receive(event)
      await robot.receive(event2)
      expect(spy.calls.length).toEqual(2)
    })
  })

  describe('receive', () => {
    it('delivers the event', async () => {
      const spy = expect.createSpy()
      robot.on('test', spy)

      await robot.receive(event)

      expect(spy).toHaveBeenCalled()
    })

    it('waits for async events to resolve', async () => {
      const spy = expect.createSpy()

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

    it('returns a reject errors thrown in plugins', async () => {
      robot.on('test', () => {
        throw new Error('error from plugin')
      })

      try {
        await robot.receive(event)
        throw new Error('expected error to be raised from plugin')
      } catch (err) {
        expect(err.message).toEqual('error from plugin')
      }
    })
  })

  describe('error handling', () => {
    let error

    beforeEach(() => {
      error = new Error('testing')
      robot.log.error = expect.createSpy()
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

      const arg = robot.log.error.calls[0].arguments[0]
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
      const arg = robot.log.error.calls[0].arguments[0]
      expect(arg.err).toBe(error)
      expect(arg.event).toBe(event)
    })
  })
})
