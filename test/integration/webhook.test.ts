process.env.LOG_LEVEL = 'trace'
import { createProbot } from '../..'
import request from 'supertest'
import data from '../fixtures/webhook/push.json'

describe('webhooks', async function () {
  test('it works', async function () {
    const probot = createProbot({id: 1, cert: 'aw4sed5rf6tg7y8hu'})
    await request(probot.server)
      .post('/')
      .send(data)
      .set('x-github-event', 'push')
      .set('x-hub-signature', probot.webhook.sign(data))
      .set('x-github-delivery', '3sw4d5f6g7h8')
      .expect(200)
  })

  test('it works', async function () {
    const probot = createProbot({id: 1, cert: 'aw4sed5rf6tg7y8hu'})
    await request(probot.server)
      .post('/')
      .send(data)
      .set('x-github-event', 'push')
      //.set('x-hub-signature') // missing
      .set('x-github-delivery', '3sw4d5f6g7h8')
      .expect(400)
  })
})
