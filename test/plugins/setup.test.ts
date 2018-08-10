import express from 'express'
import request from 'supertest'
import { Application } from '../../src'
import appFn from '../../src/plugins/setup'
import { createApp } from './helper'

describe('Setup app', () => {
  let server: express.Application
  let app: Application

  beforeEach(async () => {
    app = createApp(appFn)
    server = express()
    server.use(app.router)
  })

  describe('GET /probot', () => {
    it('returns a 200 response', () => {
      return request(server).get('/probot').expect(200)
    })
  })
})
