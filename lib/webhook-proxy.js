const EventSource = require('eventsource')

module.exports = ({url, logger, webhook}) => {
  logger.trace({url}, 'Setting up webhook proxy')
  const events = new EventSource(url)

  // Reconnect immediately
  events.reconnectInterval = 0

  events.onerror = (err) => {
    if (events.readyState === EventSource.CONNECTING) {
      logger.trace({url, err}, 'Reconnecting to webhook proxy')
    } else if (err.status) {
      logger.error(err, 'Webhook proxy error')
    }
  }

  events.onmessage = (msg) => {
    logger.trace(msg, 'Message from webhook proxy')

    const data = JSON.parse(msg.data)
    const sig = data['x-hub-signature']

    if (sig && webhook.verify(sig, JSON.stringify(data.body))) {
      const event = {
        event: data['x-github-event'],
        id: data['x-github-delivery'],
        payload: data.body,
        protocol: data['x-forwarded-proto'],
        host: data['host']
      }

      logger.debug({event}, 'Webhook received from proxy')
      webhook.emit(event.event, event)
      webhook.emit('*', event)
    } else {
      const err = new Error('X-Hub-Signature does not match blob signature')
      webhook.emit('error', err, msg.data)
    }
  }

  return events
}
