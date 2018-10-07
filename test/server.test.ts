import { Application, NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { logger } from '../src/logger'
import { createServer } from '../src/server'

describe('server', () => {
  let server: Application

  beforeEach(() => {
    server = createServer({ logger })

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

  describe('with an unknown url', () => {
    it('responds with 404', () => {
      return request(server).get('/lolnotfound').expect(404)
    })
  })
})
