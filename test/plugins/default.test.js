const request = require('supertest')
const express = require('express')
const plugin = require('../../lib/plugins/default')
const helper = require('./helper')
const fs = require('fs')
const path = require('path')

describe('default plugin', function () {
  let server, robot

  beforeEach(async () => {
    robot = helper.createRobot()

    await plugin(robot)

    server = express()

    server.use(robot.router)
  })

  describe('GET /probot', () => {
    it('returns a 200 response', () => {
      return request(server).get('/probot').expect(200)
    })

    describe('Package data collection', () => {
      let cwd = process.cwd()
      const pathTo = file => path.join(__dirname, '..', 'fixtures', 'plugin', file)

      it('returns the correct HTML with values', async () => {
        const expected = fs.readFileSync(pathTo('with-package.html'), 'utf8')
        const actual = await request(server).get('/probot').expect(200)
        expect(actual.text).toBe(expected)
      })

      it('returns the correct HTML without values', async () => {
        process.chdir(__dirname)
        const expected = fs.readFileSync(pathTo('without-package.html'), 'utf8')
        const actual = await request(server).get('/probot').expect(200)
        expect(actual.text).toBe(expected)
      })

      afterAll(() => {
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
