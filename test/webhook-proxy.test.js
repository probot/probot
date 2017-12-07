const express = require('express')
const sse = require('connect-sse')()
const createWebhook = require('github-webhook-handler')
const createWebhookProxy = require('../lib/webhook-proxy')
const logger = require('../lib/logger')

describe('webhook-proxy', () => {
  let app, server, proxy, webhook, url, emit

  beforeEach((done) => {
    app = express()

    app.get('/events', sse, function (req, res) {
      res.json({}, 'ready')
      emit = res.json
    })

    webhook = createWebhook({path: '/', secret: 'test'})
    server = app.listen(0, () => {
      url = `http://127.0.0.1:${server.address().port}/events`
      proxy = createWebhookProxy({url, logger, webhook})

      // Wait for proxy to be ready
      proxy.addEventListener('ready', () => done())
    })
  })

  afterEach(() => {
    server.close()
    proxy.close()
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

    const body = {action: 'foo'}

    emit({
      'x-github-event': 'test',
      body
    })
  })
})
