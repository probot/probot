const request = require('supertest')
const { createServer, createLogger } = require('probot')

const logger = createLogger()

describe('server', function () {
  let server

  beforeEach(() => {
    server = createServer({logger})

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

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
