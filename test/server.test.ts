import request from 'supertest'
import { logger } from '../src/logger'
import { createServer } from '../src/server'

describe('server', () => {
  let server: any
  let webhook: any

  beforeEach(() => {
    webhook = jest.fn((req, res, next) => next())
    server = createServer({ webhook, logger })

    // Error handler to avoid printing logs
    server.use((err: any, req: any, res: any, next: any) => {
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
      webhook.mockImplementation((req: any, res: any, callback: any) => callback(new Error('webhook error')))
      return request(server).post('/').expect(500)
    })
  })

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
