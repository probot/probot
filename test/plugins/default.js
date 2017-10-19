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
  })

  describe('GET /', () => {
    it('redirects to /probot', () => {
      return request(server).get('/').expect(302).expect('location', '/probot')
    })
  })
})
