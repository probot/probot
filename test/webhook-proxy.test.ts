import express from 'express'
import { Server } from 'http'
import nock from 'nock'
import { logger } from '../src/logger'
import { createWebhookProxy } from '../src/webhook-proxy'

// tslint:disable-next-line:no-var-requires
const sse = require('connect-sse')()

const targetPort = 999999

describe('webhook-proxy', () => {
  let app: express.Application
  let server: Server
  let proxy: any
  let emit: express.Send

  afterEach(() => {
    server && server.close()
    proxy && proxy.close()
  })

  describe('with a valid proxy server', () => {
    beforeEach((done) => {
      app = express()

      app.get('/events', sse, (req, res) => {
        res.json({}, 'ready') // fixme: not sure how to convert this to TypeScript
        emit = res.json
      })

      server = app.listen(0, () => {
        const url = `http://127.0.0.1:${server.address().port}/events`
        proxy = createWebhookProxy({ url, port: targetPort, path: '/test', logger })

        // Wait for proxy to be ready
        proxy.addEventListener('ready', () => done())
      })
    })

    test('forwards events to server', (done) => {
      nock(`http://localhost:${targetPort}`).post('/test').reply(200, () => {
        done()
      })

      const body = { action: 'foo' }

      emit({
        body,
        'x-github-event': 'test'
      })
    })
  })

  test('logs an error when the proxy server is not found', (done) => {
    const url = 'http://bad.proxy/events'
    nock('http://bad.proxy').get('/events').reply(404)

    const options = {}
    const log = logger.child(options)
    log.error = jest.fn()

    proxy = createWebhookProxy({ url, logger: log })

    proxy.on('error', (err: any) => {
      expect(err.status).toBe(404)
      expect(log.error).toHaveBeenCalledWith(err)
      done()
    })
  })
})
