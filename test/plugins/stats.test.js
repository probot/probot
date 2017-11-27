const request = require('supertest')
const express = require('express')
const nock = require('nock')
const plugin = require('../../lib/plugins/stats')

const helper = require('./helper')

describe('stats', function () {
  let robot, server

  beforeEach(async () => {
    nock('https://api.github.com')
     .defaultReplyHeaders({'Content-Type': 'application/json'})
     .post('/installations/1/access_tokens').reply(200, {token: 'test'})
     .get('/app/installations?per_page=100').reply(200, [{id: 1, account: {login: 'testing'}}])
     .get('/installation/repositories').reply(200, {repositories: [
       {private: true, stargazers_count: 1},
       {private: false, stargazers_count: 2}
     ]})

    robot = helper.createRobot()

    await plugin(robot)

    server = express()
    server.use(robot.router)
  })

  describe('GET /probot/stats', () => {
    it('returns installation count and popular accounts', () => {
      return request(server).get('/probot/stats')
        .expect(200, {'installations': 1, 'popular': [{login: 'testing', stars: 2}]})
    })
  })
})
