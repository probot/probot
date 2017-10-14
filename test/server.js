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
    it('returns a 200 repsonse', () => {
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
})
