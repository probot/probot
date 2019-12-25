import nock from 'nock'
import { Application } from '../src'
import eventCheck, { clearCache } from '../src/webhook-event-check'
import { newApp } from './apps/helper'

/**
 * Returns a mocked request for `/meta` with the subscribed `events`.
 *
 * By default, the mocked payload indicates the a GitHub App is subscribed to
 * the `issues` event.
 */
function mockAppMetaRequest (events: string[] = ['issues']) {
  return { events }
}

describe('webhook-event-check', () => {
  let app: Application
  let originalNodeEnv: string
  const unsubscribedEventName = 'label.created'

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV || 'test'
  })

  beforeEach(() => {
    delete process.env.DISABLE_WEBHOOK_EVENT_CHECK
    nock.cleanAll()
    clearCache()
  })

  test('caches result of /app', async () => {
    nock('https://api.github.com')
      .defaultReplyHeaders({ 'Content-Type': 'application/json' })
      .get('/app').reply(200, mockAppMetaRequest(['label', 'star']))
    app = newApp()
    const spyOnAuth = jest.spyOn(app, 'auth')
    const spyOnLogError = jest.spyOn(app.log, 'error')
    expect(await eventCheck(app, 'label.edited')).toStrictEqual(true)
    nock('https://api.github.com')
      .defaultReplyHeaders({ 'Content-Type': 'application/json' })
      .get('/app').reply(200, mockAppMetaRequest(['team']))
    expect(await eventCheck(app, 'label.deleted')).toStrictEqual(true)
    expect(await eventCheck(app, 'team.created')).toStrictEqual(false)
    expect(spyOnAuth).toHaveBeenCalledTimes(1)
    expect(spyOnLogError).toMatchSnapshot()
  })

  test('returns undefined for that will never be in the payload of /meta', async () => {
    nock('https://api.github.com')
      .defaultReplyHeaders({ 'Content-Type': 'application/json' })
      .get('/app').reply(200, mockAppMetaRequest([]))
    app = newApp()
    expect(await eventCheck(app, '*')).toStrictEqual(true)
  })

  describe('warn user when', () => {
    test('listening to unsubscribed event', async () => {
      nock('https://api.github.com')
        .defaultReplyHeaders({ 'Content-Type': 'application/json' })
        .get('/app').reply(200, mockAppMetaRequest())
      app = newApp()
      const spyOnLogError = jest.spyOn(app.log, 'error')
      expect(await eventCheck(app, 'pull_request.opened')).toStrictEqual(false)
      expect(spyOnLogError).toHaveBeenCalledTimes(1)
      expect(spyOnLogError).toMatchSnapshot()
    })

    test('unable to retrieve app metadata', async () => {
      nock('https://api.github.com')
        .defaultReplyHeaders({ 'Content-Type': 'application/json' })
        .get('/app').reply(404)
      app = newApp()
      const spyOnLogWarn = jest.spyOn(app.log, 'warn')
      expect(await eventCheck(app, unsubscribedEventName)).toBeUndefined()
      expect(spyOnLogWarn).toHaveBeenCalledTimes(1)
      expect(spyOnLogWarn).toMatchSnapshot()
    })
  })

  describe('can be disabled', () => {
    beforeEach(() => {
      delete process.env.DISABLE_WEBHOOK_EVENT_CHECK
      delete process.env.NODE_ENV
    })

    test('when DISABLE_WEBHOOK_EVENT_CHECK is true', async () => {
      process.env.DISABLE_WEBHOOK_EVENT_CHECK = 'true'
      app = newApp()
      const spyOnAuth = jest.spyOn(app, 'auth')
      expect(await eventCheck(app, 'issues.opened')).toBeUndefined()
      expect(spyOnAuth).toHaveBeenCalledTimes(0)
    })

    test('when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production'
      app = newApp()
      const spyOnAuth = jest.spyOn(app, 'auth')
      expect(await eventCheck(app, 'issues.opened')).toBeUndefined()
      expect(spyOnAuth).toHaveBeenCalledTimes(0)
    })
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })
})
