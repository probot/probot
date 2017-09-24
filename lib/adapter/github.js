const createWebhook = require('github-webhook-handler')

class GitHubAdapter {
  constructor ({logger}, options) {
    this.logger = logger
    this.webhook = createWebhook({path: options.webhookPath || '/', secret: options.secret || 'development'})

    // Log all webhook errors
    this.webhook.on('error', e => logger.error(e))
  }

  get router () {
    return this.webhook
  }

  listen (handler) {
    this.webhook.on('*', event => {
      // Log all received webhooks
      this.logger.trace(event, 'webhook received')

      // Deliver the event
      handler(event)
    })
  }
}

module.exports = GitHubAdapter
