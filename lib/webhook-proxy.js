const EventSource = require('eventsource')

module.exports = probot => {
  const events = new EventSource(process.env.WEBHOOK_PROXY_URL)

  events.onmessage = (msg) => {
    probot.logger.trace(msg, 'Message from webhook proxy')

    const data = JSON.parse(msg.data)

    // TODO: verify x-hug-signature

    const event = {
      event: data['x-github-event'],
      id: data['x-github-delivery'],
      payload: data.body,
      protocol: data['x-forwarded-proto'],
      host: data['host']
    }

    probot.logger.debug({event}, 'Webhook received from proxy')

    probot.receive(event)
  }
}
