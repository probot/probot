const request = require('supertest')
const createServer = require('../lib/server')

describe('server', function () {
  let server
  let webhook

  beforeEach(() => {
    webhook = jest.fn((req, res, next) => next())
    server = createServer(webhook)

    // Error handler to avoid printing logs
    server.use(function (err, req, res, next) {
      res.status(500).send(err.message)
    })
  })

  describe('GET /ping', () => {
    it('returns a 200 response', () => {
      return request(server).get('/ping').expect(200, 'PONG')
    })

    it('includes X-Response-Time header', () => {
      return request(server).get('/ping').expect('X-Response-Time', /^[\d.]+ms$/)
    })

    it('does not include X-Powered-By header', () => {
      return request(server).get('/ping').expect(res => {
        expect(res.headers['x-powered-by']).toBe(undefined)
      })
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
})
