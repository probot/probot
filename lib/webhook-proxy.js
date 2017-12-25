const EventSource = require('eventsource')

module.exports = ({url, logger, webhook}) => {
  logger.trace({url}, 'Setting up webhook proxy')
  const events = new EventSource(url)

  events.addEventListener('message', async (msg) => {
    logger.trace(msg, 'Message from webhook proxy')

    const data = JSON.parse(msg.data)

    try {
      await webhook.verifyAndReceive({
        id: data['x-github-delivery'],
        name: data['x-github-event'],
        payload: data['body'],
        signature: data['x-hub-signature']
      })
    } catch (error) {
      // ignore, handle with "error" event handlers
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
