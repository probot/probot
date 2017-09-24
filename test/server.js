const request = require('supertest')
const createServer = require('../lib/server')

describe('server', function () {
  let server

  beforeEach(() => {
    server = createServer()
  })

  describe('GET /ping', () => {
    it('returns a 200 repsonse', () => {
      return request(server).get('/ping').expect(200, 'PONG')
    })
  })

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
