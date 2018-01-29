process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'fatal'
const request = require('supertest')
const nock = require('nock')
const path = require('path')

const createProbot = require('probot')

const payload = require('../test/fixtures/webhook/push')
const fixture = JSON.stringify(payload, null, 2)
const cert = require('fs').readFileSync(path.join(__dirname, '../test/fixtures/private-key.pem'))

nock.enableNetConnect(/127\.0\.0\.1/)

describe('GitHubAdapter', () => {
  let probot, options, adapter, api

  beforeEach(() => {
    nock.cleanAll()

    api = nock('https://api.github.com/')

    options = {
      id: 1,
      cert,
      webhookPath: '/',
      catchErrors: false
    }

    // FIXME: refactor tests to load adapter directly
    probot = createProbot(options)
    adapter = probot.adapter
  })

  afterEach(() => {
    expect(api.pendingMocks()).toEqual([])
  })

  test('delivers webhooks to the app', async (done) => {
    // Mock out GitHub API calls that will be performed
    api.post('/installations/1729/access_tokens')
      .reply(201, {token: 'test'})
    api.get('/repos/bkeepers-inc/test/issues/1')
      .matchHeader('authorization', 'token test')
      .reply(200, {foo: 'bar'})

    // Load a probot app for testing
    probot.load(robot => {
      robot.on('push', async context => {
        expect(context.event).toEqual('push')
        const res = await context.github.issues.get(context.repo({number: 1}))
        expect(res.data).toEqual({foo: 'bar'})

        done()
      })
    })

    await request(probot.server).post('/')
      .send(fixture)
      .set('Content-Type', 'application/json')
      .set('X-GitHub-Delivery', '1')
      .set('X-GitHub-Event', 'push')
      .set('X-Hub-Signature', adapter.middleware.sign(fixture))
      .expect(200)
  })

  test('fails with an invalid signature', () => {
    return request(probot.server).post('/')
      .send(fixture)
      .set('Content-Type', 'application/json')
      .set('X-GitHub-Delivery', '2')
      .set('X-GitHub-Event', 'push')
      .set('X-Hub-Signature', 'invalid')
      .expect(400)
  })

  test('does not override GET /', () => {
    probot.server.get('/', (req, res) => res.end('get-webhook'))
    return request(probot.server).get('/').expect(200, 'get-webhook')
  })

  test('allows users to configure webhook path', async (done) => {
    options.webhookPath = '/webhook'
    probot = createProbot(options)

    probot.load(robot => {
      robot.on('push', () => {
        // test is done when robot receives the event
        done()
      })
    })

    api.post('/installations/1729/access_tokens')
      .reply(201, {token: 'test'})

    // Post should return webhook response
    return request(probot.server).post('/webhook')
      .send(fixture)
      .set('Content-Type', 'application/json')
      .set('X-GitHub-Delivery', 'b51f38f0-9fec-11e7-8359-02048d903941')
      .set('X-GitHub-Event', 'push')
      .set('X-Hub-Signature', adapter.middleware.sign(fixture))
      .expect(200, {'ok': true})
  })

  describe('auth', () => {
    describe('with an installation id', () => {
      beforeEach(() => {
        api.post('/installations/1/access_tokens')
          .reply(201, {token: 'test'})
      })

      test('returns an authenticated github client', async () => {
        api.get('/user')
          .matchHeader('authorization', 'token test')
          .reply(200, {hello: 'world'})

        const client = await adapter.auth(1)
        const res = await client.users.get()
        expect(res.data).toEqual({hello: 'world'})
      })

      test('caches the token', async () => {
        await adapter.auth(1)
        // nock will fail here if there's a second request
        await adapter.auth(1)
      })
    })

    describe('without an installation id', () => {
      test('returns an authenticated github client', async () => {
        const github = await adapter.auth()

        api.get('/app')
          .matchHeader('authorization', /^Bearer/)
          .reply(200, {name: 'test'})

        const res = await github.apps.get()
        expect(res.data).toEqual({name: 'test'})
      })
    })
  })
})
