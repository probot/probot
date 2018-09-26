import express from 'express'
import request from 'supertest'
import { Application } from '../../src'
import appFn from '../../src/apps/setup'
import { ManifestCreation } from '../../src/manifest-creation'
import { newApp } from './helper'

describe('Setup app', () => {
  let server: express.Application
  let app: Application
  let setup: ManifestCreation

  beforeEach(async () => {
    app = newApp()
    setup = new ManifestCreation()

    setup.createWebhookChannel = jest.fn()

    await appFn(app, setup)
    server = express()
    server.use(app.router)
  })

  describe('GET /probot', () => {
    it('returns a 200 response', () => {
      return request(server)
        .get('/probot')
        .expect(200)
    })
  })

  describe('GET /probot/setup', () => {
    it('returns a 200 response', () => {
      return request(server)
        .get('/probot')
        .expect(200)
    })
  })

  describe('GET /probot/success', () => {
    it('returns a 200 response', () => {
      return request(server)
        .get('/probot/success')
        .expect(200)
    })
  })
})
