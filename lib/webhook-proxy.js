const EventSource = require('eventsource')

module.exports = ({url, logger, webhook}) => {
  logger.trace({url}, 'Setting up webhook proxy')
  const events = new EventSource(url)

  events.addEventListener('message', (msg) => {
    logger.trace(msg, 'Message from webhook proxy')

    const data = JSON.parse(msg.data)
    const sig = data['x-hub-signature']

    if (sig && webhook.verify(sig, JSON.stringify(data.body))) {
      const event = {
        event: data['x-github-event'],
        id: data['x-github-delivery'],
        payload: data['body'],
        protocol: data['x-forwarded-proto'],
        host: data['host']
      }

      webhook.emit(event.event, event)
      webhook.emit('*', event)
    } else {
      const err = new Error('X-Hub-Signature does not match blob signature')
      webhook.emit('error', err, msg.data)
    }
  })

  // Reconnect immediately
  events.reconnectInterval = 0

  events.addEventListener('error', err => {
    if (!err.status) {
      // Errors are randomly re-emitted for no reason
      // See https://github.com/EventSource/eventsource/pull/85
    } else if (err.status >= 400 && err.status < 500) {
      // Nothing we can do about it
      logger.error({url, err}, 'Webhook proxy error')
    } else if (events.readyState === EventSource.CONNECTING) {
      logger.trace({url, err}, 'Reconnecting to webhook proxy')
    } else {
      logger.error({url, err}, 'Webhook proxy error')
    }
  })

  return events
}
