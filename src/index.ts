import { WebhookEvent } from '@octokit/webhooks'
import Logger from 'bunyan'
import express from 'express'
import { Application } from './application'
import { Context } from './context'
import { GitHubApp, Options as GitHubAppOptions } from './github-app'
import { logger } from './logger'
import { resolve } from './resolver'
import { createServer } from './server'
import { createWebhookProxy } from './webhook-proxy'

const logRequestErrors = require('./middleware/log-request-errors')

const defaultApps: ApplicationFunction[] = [
  require('./plugins/default'),
  require('./plugins/sentry'),
  require('./plugins/stats')
]
// tslint:enable:no-var-requires

export class Probot {
  public server: express.Application
  public logger: Logger

  private options: Options
  private apps: Application[]
  private github: GitHubApp

  constructor (options: Options) {
    this.github = new GitHubApp({
      cert: options.cert,
      id: options.id,
      secret: options.secret,
      webhookPath: options.webhookPath
    })
    this.options = options
    this.logger = logger
    this.apps = []
    this.server = createServer({ logger })
    this.server.use(this.github.router)

    // Log all received webhooks
    this.github.webhooks.on('*', this.receive.bind(this))
  }

  public receive (event: WebhookEvent) {
    this.logger.debug({ event }, 'Webhook received')
    return Promise.all(this.apps.map(app => app.receive(event)))
  }

  public load (appFunction: string | ApplicationFunction) {
    if (typeof appFunction === 'string') {
      appFunction = resolve(appFunction) as ApplicationFunction
    }

    const app = new Application({ github: this.github, catchErrors: true })

    // Connect the router from the app to the server
    this.server.use(app.router)

    // Initialize the plugin
    app.load(appFunction)
    this.apps.push(app)

    return app
  }

  public setup (apps: Array<string | ApplicationFunction>) {
    // Log all unhandled rejections
    process.on('unhandledRejection', this.github.errorHandler)

    // Load the given apps along with the default apps
    apps.concat(defaultApps).forEach(app => this.load(app))

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

export interface Options extends GitHubAppOptions {
  webhookProxy?: string,
  port?: number
}

export { Logger, Context, Application }
