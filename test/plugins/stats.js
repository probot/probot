const request = require('supertest')
const express = require('express')
const {createRobot} = require('../..')
const plugin = require('../../lib/plugins/stats')
const nock = require('nock')

const cacheManager = require('cache-manager')
const GitHubApi = require('github')

nock.disableNetConnect()
nock.enableNetConnect(/127\.0\.0\.1/)

describe('stats', function () {
  let robot, server

  beforeEach(async () => {
    nock('https://api.github.com')
     .defaultReplyHeaders({'Content-Type': 'application/json'})
     .get('/app/installations?per_page=100').reply(200, [{id: 1, account: {login: 'testing'}}])
     .get('/installation/repositories').reply(200, {repositories: [
       {private: true, stargazers_count: 1},
       {private: false, stargazers_count: 2}
     ]})

    // FIXME: move this and app setup below to a test harness
    const cache = cacheManager.caching({store: 'memory'})

    const app = {
      async asApp () {
        return new GitHubApi()
      },

      async asInstallation () {
        return new GitHubApi()
      },

      async createToken () {
        return {data: {token: 'test'}}
      }
    }
    robot = createRobot({app, cache})

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
