const Raven = require('raven')

const plugin = require('../../src/plugins/sentry')

const helper = require('./helper')

describe('sentry', () => {
  let robot

  beforeEach(async () => {
    robot = helper.createRobot()
  })

  beforeEach(() => {
    // Clean up env variable
    delete process.env.SENTRY_DSN
  })

  describe('with an invalid SENTRY_DSN', () => {
    test('throws an error', () => {
      process.env.SENTRY_DSN = 1233
      expect(() => {
        plugin(robot)
      }).toThrow(/Invalid Sentry DSN: 1233/)
    })
  })

  describe('with a SENTRY_DSN', () => {
    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://user:pw@sentry.io/123'
      plugin(robot)
      Raven.captureException = jest.fn()
    })

    test('sends reported errors to sentry', () => {
      const err = new Error('test message')
      robot.log.error(err)

      expect(Raven.captureException).toHaveBeenCalledWith(err, expect.objectContaining({
        extra: expect.anything()
      }))
    })
  })
})
