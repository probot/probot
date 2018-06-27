const express = require('express')
const sse = require('connect-sse')()
const nock = require('nock')
const {createWebhookProxy} = require('../src/webhook-proxy')
const {logger} = require('../src/logger')

const targetPort = 999999

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
        proxy = createWebhookProxy({url, port: targetPort, path: '/test', logger})

        // Wait for proxy to be ready
        proxy.addEventListener('ready', () => done())
      })
    })

    test('forwards events to server', (done) => {
      nock(`http://localhost:${targetPort}`).post('/test').reply(200, () => {
        done()
      })

      const body = {action: 'foo'}

      emit({
        'x-github-event': 'test',
        body
      })
    })
  })

  test('logs an error when the proxy server is not found', (done) => {
    const url = 'http://bad.proxy/events'
    nock('http://bad.proxy').get('/events').reply(404)

    const log = logger.child()
    log.error = jest.fn()

    proxy = createWebhookProxy({url, logger: log})

    proxy.on('error', err => {
      expect(err.status).toBe(404)
      expect(log.error).toHaveBeenCalledWith(err)
      done()
    })
  })
})
