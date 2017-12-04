const EventSource = require('eventsource')

module.exports = ({logger, receive, url = process.env.WEBHOOK_PROXY_URL}) => {
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

    // TODO: verify x-hub-signature

    const event = {
      event: data['x-github-event'],
      id: data['x-github-delivery'],
      payload: data.body,
      protocol: data['x-forwarded-proto'],
      host: data['host']
    }

    logger.debug({event}, 'Webhook received from proxy')

    receive(event)
  }

}
