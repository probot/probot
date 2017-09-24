const request = require('supertest')
const createProbot = require('../..')

const fixture = JSON.stringify(require('../fixtures/webhook/push'), null, 2)

describe('github adapter', () => {
  let probot

  beforeEach(() => {
    // FIXME: refactor tests to load adapter directly
    probot = createProbot({secret: 'test'})

    // Error handler to avoid printing logs
    // eslint-disable-next-line handle-callback-err
    probot.server.use((err, req, res, next) => { })
  })

  describe('webhook', () => {
    it('receives a webhook', () => {
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
        probot = createProbot({secret: 'test', webhookPath: '/webhook'})
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
})
