const request = require('supertest')
const createServer = require('../lib/server')

describe('server', function () {
  let server
  let webhook
  let logger

  beforeEach(() => {
    logger = {
      info: (data, msg) => { logger._info = {data, msg} },
      trace: (data, msg) => { logger._trace = {data, msg} }
    }
    webhook = jest.fn((req, res, next) => next())
    server = createServer(webhook, logger)

    // Error handler to avoid printing logs
    server.use(function (err, req, res, next) {
      res.status(500).send(err.message)
    })
  })

  describe('GET /ping', () => {
    it('returns a 200 response', () => {
      return request(server).get('/ping').expect(200, 'PONG')
    })
  })

  describe('webhook handler', () => {
    it('should 500 on a webhook error', () => {
      webhook.mockImplementation((req, res, callback) => callback(new Error('webhook error')))
      return request(server).post('/').expect(500)
    })
  })

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })

  describe('logging', () => {
    it('should log to info by default', () => {
      return request(server).get('/loginfo').expect(() => {
        if (!(logger._info.msg === 'request' && logger._info.data.path === '/loginfo')) throw new Error('Logging failed')
        if (logger._trace) throw new Error('Logging to wrong level')
      })
    })

    it('should log to trace when LOG_LEVEL=trace', () => {
      process.env.LOG_LEVEL = 'trace'
      return request(server).get('/logtrace').expect(() => {
        if (!(logger._trace.msg === 'request' && logger._trace.data.path === '/logtrace')) throw new Error('Logging failed')
        if (logger._info) throw new Error('Logging to wrong level')
      })
    })
  })
})
