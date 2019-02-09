import Logger from 'bunyan'
// @ts-ignore
// tslint:disable-next-line:no-implicit-dependencies
import EventSource from 'eventsource' // This is needed for now to resolve error TS4023, until smee-client gets it's own types or get's rewritten in TypeScript.
import SmeeClient = require('smee-client')

export const createWebhookProxy = (opts: WebhookProxyOptions) => {
  try {
    const smee = new SmeeClient({
      logger: opts.logger,
      source: opts.url,
      target: `http://localhost:${opts.port}${opts.path}`
    })
    return smee.start()
  } catch (err) {
    opts.logger.warn('Run `npm install --save-dev smee-client` to proxy webhooks to localhost.')
    return
  }
}

export interface WebhookProxyOptions {
  url?: string
  port?: number
  path?: string
  logger: Logger
}
