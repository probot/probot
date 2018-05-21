const request = require('supertest')
const express = require('express')
const nock = require('nock')
const plugin = require('../../src/plugins/stats')

const helper = require('./helper')

describe('stats', function () {
  let app, server

  beforeEach(() => {
    // Clean up env variable
    delete process.env.DISABLE_STATS

    server = express()
  })

  describe('GET /probot/stats', () => {
    beforeEach(async () => {
      nock('https://api.github.com')
        .defaultReplyHeaders({'Content-Type': 'application/json'})
        .post('/installations/1/access_tokens').reply(200, {token: 'test'})
        .get('/app/installations?per_page=100').reply(200, [{id: 1, account: {login: 'testing'}}])
        .get('/installation/repositories?per_page=100').reply(200, {repositories: [
          {private: true, stargazers_count: 1},
          {private: false, stargazers_count: 2}
        ]})

      app = helper.createApp(plugin)
      server.use(app.router)
    })

    it('returns installation count and popular accounts', () => {
      return request(server).get('/probot/stats')
        .expect(200, {'installations': 1, 'popular': [{login: 'testing', stars: 2}]})
    })
  })

  describe('can be disabled', () => {
    beforeEach(async () => {
      process.env.DISABLE_STATS = 'true'

      app = helper.createApp(plugin)
      server.use(app.router)
    })

    it('/probot/stats returns 404', () => {
      return request(server).get('/probot/stats').expect(404)
    })
  })

  describe('it ignores spammy users', () => {
    beforeEach(async () => {
      process.env.IGNORED_ACCOUNTS = 'hiimbex,spammyUser'
      nock('https://api.github.com')
        .defaultReplyHeaders({'Content-Type': 'application/json'})
        .post('/installations/1/access_tokens').reply(200, {token: 'test'})
        .get('/app/installations?per_page=100').reply(200, [{id: 1, account: {login: 'spammyUser'}}])
        .get('/installation/repositories?per_page=100').reply(200, {repositories: [
          {private: true, stargazers_count: 1},
          {private: false, stargazers_count: 2}
        ]})

      app = helper.createApp(plugin)
      server.use(app.router)
    })

    it('returns installation count and popular accounts while exclusing spammy users', () => {
      return request(server).get('/probot/stats')
        .expect(200, {'installations': 1, 'popular': []})
    })

    afterEach(async () => {
      delete process.env.IGNORED_ACCOUNTS
    })
  })
})
