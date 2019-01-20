import OctokitApp from '@octokit/app'
import Webhooks, { WebhookEvent } from '@octokit/webhooks'
import Logger from 'bunyan'
import express from 'express'

import { Application } from './application'
import { createDefaultCache } from './cache'
import { Context } from './context'
import { logger } from './logger'
import { resolve } from './resolver'
import { createServer } from './server'
import { createWebhookProxy } from './webhook-proxy'

// tslint:disable:no-var-requires
// These needs types
const logRequestErrors = require('./middleware/log-request-errors')

const cache = createDefaultCache()

const defaultAppFns: ApplicationFunction[] = [
  require('./apps/default'),
  require('./apps/sentry'),
  require('./apps/stats')
]
// tslint:enable:no-var-requires

export class Probot {
  public server: express.Application
  public webhook: Webhooks
  public logger: Logger

  private options: Options
  private apps: Application[]
  private app?: OctokitApp
  private githubToken?: string

  constructor (options: Options) {
    options.webhookPath = options.webhookPath || '/'
    options.secret = options.secret || 'development'
    this.options = options
    this.logger = logger
    this.apps = []
    this.webhook = new Webhooks({ path: options.webhookPath, secret: options.secret })
    this.githubToken = options.githubToken
    if (this.options.id) {
      this.app = new OctokitApp({
        id: options.id as number,
        privateKey: options.cert as string
      })
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

  public load (appFn: string | ApplicationFunction) {
    if (typeof appFn === 'string') {
      appFn = resolve(appFn) as ApplicationFunction
    }
    const app = new Application({
      app: this.app as OctokitApp,
      cache,
      githubToken: this.githubToken
    })

    // Connect the router from the app to the server
    this.server.use(app.router)

    // Initialize the ApplicationFunction
    app.load(appFn)
    this.apps.push(app)

    return app
  }

  public setup (appFns: Array<string | ApplicationFunction>) {
    // Log all unhandled rejections
    process.on('unhandledRejection', this.errorHandler)

    // Load the given appFns along with the default ones
    appFns.concat(defaultAppFns).forEach(appFn => this.load(appFn))

    // Register error handler as the last middleware
    this.server.use(logRequestErrors)
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
