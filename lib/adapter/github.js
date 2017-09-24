const createWebhook = require('github-webhook-handler')

module.exports = (probot, options = {}) => {
  const webhook = createWebhook({path: options.webhookPath || '/', secret: options.secret || 'development'})

  probot.server.use(webhook)

  // Log all webhook errors
  webhook.on('error', e => probot.logger.error(e))

  webhook.on('*', event => {
    // Log all received webhooks
    probot.logger.trace(event, 'webhook received')

    // Deliver the event
    probot.receive(event)
  })

  // FIXME: Backward compat. Remove
  probot.webhook = webhook
}
