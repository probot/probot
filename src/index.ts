import Logger from 'bunyan'
import express from 'express'
import {Application, WebhookEvent} from './application'
import {Context} from './context'
import {GitHubApp} from './github-app'
import {logger} from './logger'
import {resolve} from './resolver'
import {createServer} from './server'
import {createWebhookProxy} from './webhook-proxy'

const logRequestErrors = require('./middleware/log-request-errors')

const defaultApps = [
  require('./plugins/sentry'),
  require('./plugins/stats'),
  require('./plugins/default')
]

export class Probot {
  public server: express.Application
  public webhook: any
  public logger: Logger

  private options: Options
  private apps: Application[]
  private adapter: GitHubApp

  constructor(options: Options) {
    this.adapter = new GitHubApp({
      cert: options.cert,
      id: options.id,
      secret: options.secret,
      webhookPath: options.webhookPath,
    })
    this.options = options
    this.logger = logger
    this.apps = []
    this.webhook = this.adapter.webhooks
    this.server = createServer({logger})
    this.server.use(this.webhook.middleware)

    // Log all received webhooks
    this.webhook.on('*', (event: any) => {
      const webhookEvent = { ...event, event: event.name }
      delete webhookEvent.name

      this.receive(webhookEvent)
    })
  }

  public receive (event: WebhookEvent) {
    this.logger.debug({event}, 'Webhook received')
    return Promise.all(this.apps.map(app => app.receive(event)))
  }

  public load (plugin: string | Plugin) {
    if (typeof plugin === 'string') {
      plugin = resolve(plugin) as Plugin
    }

    const app = new Application({adapter: this.adapter, catchErrors: true})

    // Connect the router from the app to the server
    this.server.use(app.router)

    // Initialize the plugin
    plugin(app)
    this.apps.push(app)

    return app
  }

  public setup (apps: Array<string | Plugin>) {
    // Log all unhandled rejections
    process.on('unhandledRejection', this.adapter.errorHandler)

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
        url: this.options.webhookProxy,
      })
    }

    this.server.listen(this.options.port)
    logger.info('Listening on http://localhost:' + this.options.port)
  }
}

export const createProbot = (options: Options) => new Probot(options)

export type Plugin = (app: Application) => void

export interface Options {
  webhookPath?: string
  secret?: string,
  id: number,
  cert: string,
  webhookProxy?: string,
  port?: number
}

export { Logger, Context, Application }
