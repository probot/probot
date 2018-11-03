import Webhooks, { WebhookEvent } from '@octokit/webhooks'
import Logger from 'bunyan'
import express from 'express'
import { Application } from './application'
import { createDefaultCache } from './cache'
import { Context } from './context'
import { createApp } from './github-app'
import { logger } from './logger'
import { requestErrorLogger } from './middleware/log-request-errors'
import { resolve } from './resolver'
import { createServer } from './server'

// Default Apps
import defaultApp from './apps/default'
import sentryApp from './apps/sentry'
import statsApp from './apps/stats'

import { createWebhookProxy } from './webhook-proxy'

const cache = createDefaultCache()

const defaultAppFns: ApplicationFunction[] = [
  defaultApp,
  sentryApp,
  statsApp
]

export class Probot {
  public server: express.Application
  public webhook: Webhooks
  public logger: Logger

  private options: Options
  private apps: Application[]
  private app: () => string
  private githubToken?: string

  constructor (options: Options) {
    options.webhookPath = options.webhookPath || '/'
    options.secret = options.secret || 'development'
    this.options = options
    this.logger = logger
    this.apps = []
    this.webhook = new Webhooks({ path: options.webhookPath, secret: options.secret })
    if (options.githubToken) {
      this.githubToken = options.githubToken
      this.app = () => ''
    } else {
      this.app = createApp({ id: options.id!, cert: options.cert! })
    }
    this.server = createServer({ webhook: this.webhook.middleware, logger })

    // Log all received webhooks
    this.webhook.on('*', async (event: WebhookEvent) => {
      try {
        await this.receive(event)
      } catch {
        // Errors have already been logged.
      }
    })

    // Log all webhook errors
    this.webhook.on('error', this.errorHandler)
  }

  public errorHandler (err: Error) {
    const errMessage = err.message.toLowerCase()
    if (errMessage.includes('x-hub-signature')) {
      logger.error({ err }, 'Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.')
    } else if (errMessage.includes('pem') || errMessage.includes('json web token')) {
      logger.error({ err }, 'Your private key (usually a .pem file) is not correct. Go to https://github.com/settings/apps/YOUR_APP and generate a new PEM file. If you\'re deploying to Now, visit https://probot.github.io/docs/deployment/#now.')
    } else {
      logger.error(err)
    }
  }

  public receive (event: WebhookEvent) {
    this.logger.debug({ event }, 'Webhook received')
    return Promise.all(this.apps.map(app => app.receive(event)))
  }

  public load (appFn: string | ApplicationFunction | ESMApplicationFunction) {
    if (typeof appFn === 'string') {
      appFn = resolve<ApplicationFunction | ESMApplicationFunction>(appFn)
    }
    // __esModule is a magic property babel and typescript set on their ESM exports
    // to identify them.  If it's an ESM export we should load the "default" export
    if (appFn && typeof appFn === 'object' && appFn.__esModule) {
      appFn = appFn.default
    }
    const app = new Application({ app: this.app, cache, githubToken: this.githubToken })

    // Connect the router from the app to the server
    this.server.use(app.router)

    // Initialize the ApplicationFunction
    app.load(appFn as ApplicationFunction)
    this.apps.push(app)

    return app
  }

  public setup (appFns: Array<string | ApplicationFunction>) {
    // Log all unhandled rejections
    process.on('unhandledRejection', this.errorHandler)

    // Load the given appFns along with the default ones
    appFns.concat(defaultAppFns).forEach(appFn => this.load(appFn))

    // Register error handler as the last middleware
    this.server.use(requestErrorLogger)
  }

  public start () {
    if (this.options.webhookProxy) {
      createWebhookProxy({
        logger,
        path: this.options.webhookPath,
        port: this.options.port,
        url: this.options.webhookProxy
      })
    }

    this.server.listen(this.options.port)
    logger.info('Listening on http://localhost:' + this.options.port)
  }
}

export const createProbot = (options: Options) => new Probot(options)

export type ApplicationFunction = (app: Application) => void

export type ESMApplicationFunction = {
  default: ApplicationFunction
} & Record<string, any>

export interface Options {
  webhookPath?: string
  secret?: string,
  id?: number,
  cert?: string,
  githubToken?: string,
  webhookProxy?: string,
  port?: number
}

export { Logger, Context, Application }
