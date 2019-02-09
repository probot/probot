import express = require('express')
import {Response} from 'express'
import sse_ = require('connect-sse')
const sse = sse_()
import nock = require('nock')
import {createWebhookProxy} from '../src/webhook-proxy'
import {logger} from '../src/logger'
import http = require('http')
import net = require('net')

const targetPort = 999999

describe('webhook-proxy', () => {
  let app: express.Express,
      emit: Response['json'],
      proxy: EventSource,
      server: http.Server

  afterEach(() => {
    server && server.close()
    proxy && proxy.close()
  })

  describe('with a valid proxy server', () => {
    beforeEach((done) => {
      app = express()

      app.get('/events', sse, (req, res) => {
        res.json({}, 'ready')
        emit = res.json
      })

      server = app.listen(0, () => {
        const url = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}/events`
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

    proxy.addEventListener('error', (err: any) => {
      expect(err.status).toBe(404)
      expect(log.error).toHaveBeenCalledWith(err)
      done()
    })
  })
})
