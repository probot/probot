const expect = require('expect')
const request = require('supertest')
const createServer = require('../lib/server')
const htmlString = require('../lib/probot-welcome')()

describe('server', function () {
  let server
  let webhook

  beforeEach(() => {
    webhook = expect.createSpy().andCall((req, res, next) => next())
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
  })

  describe('GET /probot', () => {
    it('returns a 200 response', () => {
      return request(server).get('/probot').expect(200, htmlString)
    })
  })

  describe('GET /', () => {
    it('redirects to /probot', () => {
      return request(server).get('/').expect(302).expect('location', '/probot')
    })
  })

  describe('custom GET /', () => {
    it('uses a user\'s custom / path', () => {
      server.get('/', (req, res) => res.status(200).end('Custom path!'))
      return request(server).get('/').expect(200, 'Custom path!')
    })
  })

  describe('webhook handler', () => {
    it('should 500 on a webhook error', () => {
      webhook.andCall((req, res, callback) => callback(new Error('webhook error')))
      return request(server).post('/').expect(500)
    })
  })

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
