const request = require('supertest')
const express = require('express')
const plugin = require('../../lib/plugins/default')
const helper = require('./helper')

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

    describe('get info from package.json', () => {
      let cwd
      beforeEach(() => {
        cwd = process.cwd()
      })

      it('returns the correct HTML with values', async () => {
        const actual = await request(server).get('/probot').expect(200)
        expect(actual.text).toMatchSnapshot()
      })

      it('returns the correct HTML without values', async () => {
        process.chdir(__dirname)
        const actual = await request(server).get('/probot').expect(200)
        expect(actual.text).toMatchSnapshot()
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
