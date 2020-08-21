import { Application, NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { logger } from '../src/logger'
import { createServer } from '../src/server'

describe('server', () => {
  let server: Application
  let webhook: any

  beforeEach(() => {
    webhook = jest.fn((req, res, next) => next())
    server = createServer({ webhook, logger })

    // Error handler to avoid printing logs
    server.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
      webhook.mockImplementation((req: Request, res: Response, callback: NextFunction) => callback(new Error('webhook error')))
      return request(server).post('/').expect(500)
    })
  })

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
