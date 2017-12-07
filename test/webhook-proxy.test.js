const express = require('express')
const sse = require('connect-sse')()
const nock = require('nock')
const createWebhook = require('github-webhook-handler')
const createWebhookProxy = require('../lib/webhook-proxy')
const logger = require('../lib/logger')

const webhook = createWebhook({path: '/', secret: 'test'})

describe('webhook-proxy', () => {
  let app, server, proxy, url, emit

  afterEach(() => {
    server && server.close()
    proxy && proxy.close()
  })

  describe('with a valid proxy server', () => {
    beforeEach((done) => {
      app = express()

      app.get('/events', sse, function (req, res) {
        res.json({}, 'ready')
        emit = res.json
      })

      server = app.listen(0, () => {
        url = `http://127.0.0.1:${server.address().port}/events`
        proxy = createWebhookProxy({url, logger, webhook})

        // Wait for proxy to be ready
        proxy.addEventListener('ready', () => done())
      })
    })

    afterEach(() => {
    })

    test('emits events with a valid signature', (done) => {
      // This test will be done when the webhook is emitted
      webhook.on('test', () => done())

      const body = {action: 'foo'}

      emit({
        'x-github-event': 'test',
        'x-hub-signature': webhook.sign(JSON.stringify(body)),
        body
      })
    })

    test('does not emit events with an invalid signature', (done) => {
      // This test will be done when the webhook is emitted
      webhook.on('error', (err) => {
        expect(err.message).toEqual('X-Hub-Signature does not match blob signature')
        done()
      })

      emit({
        'x-github-event': 'test',
        'x-hub-signature': 'lolnope',
        body: {action: 'foo'}
      })
    })
  })

  test('logs an error when the proxy server that is not found', (done) => {
    const url = 'http://bad.proxy/events'
    nock('http://bad.proxy').get('/events').reply(404)

    const log = logger.child()
    log.error = jest.fn()

    proxy = createWebhookProxy({url, webhook, logger: log})

    proxy.on('error', err => {
      expect(err.status).toBe(404)
      expect(log.error).toHaveBeenCalledWith({err, url}, 'Webhook proxy error')
      done()
    })
  })
})
