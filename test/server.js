const expect = require('expect')
const request = require('supertest')
const createServer = require('../lib/server')

describe('server', function () {
  let server
  let webhook

  beforeEach(() => {
    webhook = expect.createSpy().andCall((req, res, next) => next())
    server = createServer(webhook)
  })

  describe('GET /ping', () => {
    it('returns a 200 repsonse', () => {
      return request(server).get('/ping').expect(200, 'PONG')
    })
  })

  describe('webhook handler', () => {
    it('should 500 on a webhook error', () => {
      webhook.andCall((req, res, callback) => callback('webhook error')) // eslint-disable-line standard/no-callback-literal
      return request(server).post('/').expect(500)
    })
  })

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
