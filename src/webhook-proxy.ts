import * as Logger from 'bunyan'

export const createWebhookProxy = (opts: WebhookProxyOptions) => {
  try {
    // tslint:disable-next-line
    const SmeeClient = require('smee-client')

    const smee = new SmeeClient({
      logger: opts.logger,
      source: opts.url,
      target: `http://localhost:${opts.port}${opts.path}`,
    })
    return smee.start()
  } catch (err) {
    opts.logger.warn('Run `npm install --save-dev smee-client` to proxy webhooks to localhost.')
  }
}

export interface WebhookProxyOptions {
  url?: string
  port?: number
  path?: string
  logger: Logger
}
