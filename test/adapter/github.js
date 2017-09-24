const request = require('supertest')
const nock = require('nock')
const expect = require('expect')

const createProbot = require('../..')

const payload = require('../fixtures/webhook/push')
const fixture = JSON.stringify(payload, null, 2)
const cert = require('fs').readFileSync('./test/fixtures/private-key.pem')

nock.disableNetConnect()
nock.enableNetConnect(/127\.0\.0\.1/)

describe('github adapter', () => {
  let probot, options, adapter

  beforeEach(() => {
    options = {
      id: 1,
      cert
    }

    // FIXME: refactor tests to load adapter directly
    probot = createProbot(options)
    adapter = probot.adapter

    // Error handler to avoid printing logs
    // eslint-disable-next-line handle-callback-err
    probot.server.use((err, req, res, next) => { })
  })

  describe('webhook', () => {
    it('receives a webhook with POST /', () => {
      return request(probot.server).post('/')
        .send(fixture)
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Delivery', '1')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature', probot.adapter.webhook.sign(fixture))
        .expect(200)
    })

    it('fails with an invalid signature', () => {
      return request(probot.server).post('/')
        .send(fixture)
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Delivery', '2')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature', 'invalid')
        .expect(400)
    })

    it('does not override GET /', () => {
      probot.server.get('/', (req, res) => res.end('get-webhook'))
      return request(probot.server).get('/').expect(200, 'get-webhook')
    })

    describe('with a custom webhook path', () => {
      beforeEach(() => {
        options.webhookPath = '/webhook'
        probot = createProbot(options)
      })

      it('allows users to configure webhook paths', async () => {
        // Post should return webhook response
        await request(probot.server).post('/webhook')
          .send(fixture)
          .set('Content-Type', 'application/json')
          .set('X-GitHub-Delivery', 'b51f38f0-9fec-11e7-8359-02048d903941')
          .set('X-GitHub-Event', 'push')
          .set('X-Hub-Signature', probot.adapter.webhook.sign(fixture))
          .expect(200, {'ok': true})
      })
    })
  })

  describe('createContex', () => {
    it('returns a context with an authenticated GitHub client', async () => {
      adapter.auth = expect.createSpy().andReturn('a fake github client')

      const context = await adapter.createContext({
        payload: payload
      })

      expect(adapter.auth).toHaveBeenCalledWith(payload.installation.id)
      expect(context.payload).toEqual(payload)
      expect(context.github).toEqual('a fake github client')
    })
  })

  describe('auth', () => {
    describe('with an installation id', () => {
      beforeEach(() => {
        nock('https://api.github.com/').post('/installations/1/access_tokens')
          .reply(201, {token: 'test'})
      })

      it('returns an authenticated github client', async () => {
        const github = await probot.adapter.auth(1)

        expect(github.constructor.name).toEqual('EnhancedGitHubClient')
        expect(github.auth).toEqual({type: 'token', token: 'test'})
      })

      it('caches the token', async () => {
        const first = await probot.adapter.auth(1)
        // nock will fail here if there's a second request
        const second = await probot.adapter.auth(1)

        expect(first.auth.token).toEqual(second.auth.token)
      })
    })

    describe('without an installation id', () => {
      it('returns an authenticated github client', async () => {
        const github = await probot.adapter.auth()

        expect(github.constructor.name).toEqual('EnhancedGitHubClient')
        expect(github.auth.type).toEqual('integration')
        expect(github.auth.token).toExist()
      })
    })
  })
})
