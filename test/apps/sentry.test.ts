import Raven from 'raven'
import { Probot } from '../../src'
import sentryApp = require('../../src/apps/sentry')

describe('sentry app', () => {
  let probot: Probot

  beforeEach(async () => {
    probot = new Probot({
      id: 1,
      cert: 'private key'
    })
  })

  beforeEach(() => {
    // Clean up env variable
    delete process.env.SENTRY_DSN
  })

  describe('with an invalid SENTRY_DSN', () => {
    test('throws an error', () => {
      process.env.SENTRY_DSN = '1233'
      expect(() => probot.load(sentryApp)).toThrow(/Invalid Sentry DSN: 1233/)
    })
  })

  describe('with a SENTRY_DSN', () => {
    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://user:pw@sentry.io/123'
      probot.load(sentryApp)
      Raven.captureException = jest.fn()
    })

    test('sends reported errors to sentry', () => {
      const err = new Error('test message')
      probot.logger.error(err)

      expect(Raven.captureException).toHaveBeenCalledWith(err, expect.objectContaining({
        extra: expect.anything()
      }))
    })
  })
})
