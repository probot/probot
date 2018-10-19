import express from 'express'
import request from 'supertest'
import { Application } from '../../src'
import appFn = require('../../src/apps/default')
import { createApp } from './helper'

describe('default app', () => {
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

    describe('get info from package.json', () => {
      let cwd: string
      beforeEach(() => {
        cwd = process.cwd()
      })

      it('returns the correct HTML with values', async () => {
        const actual = await request(server).get('/probot').expect(200)
        expect(actual.text).toMatch('Welcome to probot')
        expect(actual.text).toMatch('A framework for building GitHub Apps')
        expect(actual.text).toMatch(/v\d+\.\d+\.\d+/)
      })

      it('returns the correct HTML without values', async () => {
        process.chdir(__dirname)
        const actual = await request(server).get('/probot').expect(200)
        expect(actual.text).toMatch('Welcome to your Probot App')
      })

      afterEach(() => {
        process.chdir(cwd)
      })
    })
  })

  describe('GET /', () => {
    it('redirects to /probot', () => {
      return request(server).get('/').expect(302).expect('location', '/probot')
    })
  })
})
