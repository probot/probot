import express from 'express'
import request from 'supertest'
import { Application } from '../../src'
import appFn from '../../src/plugins/setup'
import { Thingerator } from '../../src/thingerator'
const { newApp } = require('./helper')

describe('Setup app', () => {
  let server: express.Application
  let app: Application
  let setup: Thingerator

  beforeEach(async () => {
    app = newApp()
    setup = new Thingerator()

    setup.createWebhookChannel = jest.fn()

    appFn(app, setup)
    server = express()
    server.use(app.router)
  })

  describe('GET /probot', () => {
    it('returns a 200 response', () => {
      return request(server).get('/probot').expect(200)
    })
  })
})
