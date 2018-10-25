import fs from 'fs'
import request from 'supertest'
import { createProbot, Probot } from '../../src'
const data = JSON.parse(fs.readFileSync('./test/fixtures/webhook/push.json', 'UTF-8'))

describe('webhooks', async () => {
  let logger: any
  let probot: Probot

  beforeEach(() => {
    logger = jest.fn()

    probot = createProbot({ id: 1, cert: 'bexo🥪' })
    probot.logger.addStream({
      level: 'trace',
      stream: { write: logger } as any,
      type: 'raw'
    })
  })

  test('it works when all headers are properly passed onto the event', async () => {
    await request(probot.server)
      .post('/')
      .send(data)
      .set('x-github-event', 'push')
      .set('x-hub-signature', probot.webhook.sign(data))
      .set('x-github-delivery', '3sw4d5f6g7h8')
      .expect(200)
  })

  test('shows a friendly error when x-hub-signature is missing', async () => {
    await request(probot.server)
      .post('/')
      .send(data)
      .set('x-github-event', 'push')
      // Note: 'x-hub-signature' is missing
      .set('x-github-delivery', '3sw4d5f6g7h8')
      .expect(400)

    expect(logger).toHaveBeenCalledWith(expect.objectContaining({
      msg: 'Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.'
    }))
  })
})
