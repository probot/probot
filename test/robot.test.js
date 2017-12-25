const createRobot = require('../lib/robot')
const pushEventPayload = require('./fixtures/webhook/push')
const logger = require('../lib/logger')

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
      stream: { write: log => output.push(log) }
    })
  })

  beforeEach(function () {
    // Clear log output
    output = []

    robot = createRobot()
    robot.auth = () => {}
    event = {
      id: '123',
      name: 'push',
      payload: pushEventPayload
    }
  })

  describe('constructor', () => {
    it('exposes webhooks methods', async () => {
      const spy = jest.fn()

      robot.on('push', spy)
      await robot.receive(event)
      expect(spy.mock.calls.length).toBe(1)
    })

    it('accepts deprecated event.event instead of event.name', async () => {
      const spy = jest.fn()
      console.log = jest.fn()

      robot.on('push', spy)
      await robot.receive({
        event: event.name,
        payload: event.payload
      })
      expect(spy.mock.calls.length).toBe(1)
    })
  })

  describe('on', function () {
    it('adds a logger on the context', async () => {
      const handler = jest.fn().mockImplementation(context => {
        expect(context.log).toBeDefined()
        context.log('testing')

        expect(output[0]).toEqual(
          expect.objectContaining({
            msg: 'testing',
            event: expect.objectContaining({
              id: '123'
            })
          })
        )
      })

      robot.on('push', handler)
      await robot.receive(event)
      expect(handler).toHaveBeenCalled()
    })

    it('logs errors raised from event', async () => {
      const error = new Error('test error')

      robot.on('push', () => {
        throw error
      })

      try {
        await robot.receive(event)
      } catch (e) {
        // expected
      }

      expect(output[0]).toEqual(expect.objectContaining({
        err: expect.objectContaining({
          message: 'test error',
          event: expect.objectContaining({
            id: '123'
          })
        })
      }))
    })

    it('logs when handler returns a rejected promise', async () => {
      robot.on('push', () => Promise.reject(new Error('rejected promise')))

      try {
        await robot.receive(event)
      } catch (e) {
        // expected
      }

      expect(output[0]).toEqual(expect.objectContaining({
        err: expect.objectContaining({
          message: 'rejected promise',
          event: expect.objectContaining({
            id: '123'
          })
        })
      }))
    })
  })
})
