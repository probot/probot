import * as Logger from 'bunyan'
import * as cacheManager from 'cache-manager'
import * as express from 'express'
import {Context} from './context'
import {createApp} from './github-app'
import {logger} from './logger'
import {resolve} from './resolver'
import {createRobot, Robot, WebhookEvent} from './robot'
import {createServer} from './server'
import {createWebhookProxy} from './webhook-proxy'

const Webhooks = require('@octokit/webhooks')
const logRequestErrors = require('./middleware/log-request-errors')

const cache = cacheManager.caching({
  store: 'memory',
  ttl: 60 * 60 // 1 hour
})

const defaultApps = [
  require('./plugins/sentry'),
  require('./plugins/stats'),
  require('./plugins/default')
]

export const createProbot = (options: Options) => {
  options.webhookPath = options.webhookPath || '/'
  options.secret = options.secret || 'development'

  const webhook = new Webhooks({path: options.webhookPath, secret: options.secret})
  const app = createApp({
    id: options.id,
    cert: options.cert
  })
  const server: express.Application = createServer({webhook: webhook.middleware, logger})


  function errorHandler (err) {
    switch (err.message) {
      case 'X-Hub-Signature does not match blob signature':
      case 'No X-Hub-Signature found on request':
        logger.error('Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.')
        break
      case 'error:0906D06C:PEM routines:PEM_read_bio:no start line':
      case '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}':
        logger.error('Your private key (usually a .pem file) is not correct. Go to https://github.com/settings/apps/YOUR_APP and generate a new PEM file. If you\'re deploying to Now, visit https://probot.github.io/docs/deployment/#now.')
        break
      default:
        logger.error(err)
    }
  }

  // Log all received webhooks
  webhook.on('*', (event: any) => {
    const webhookEvent = {
      ...event,
      event: event.name
    }

    delete webhookEvent.name

    logger.debug({event: webhookEvent}, 'Webhook received')

    receive(webhookEvent)
  })

  // Log all webhook errors
  webhook.on('error', errorHandler)

  const robots: Robot[] = []

  function receive (event: any) {
    return Promise.all(robots.map(robot => robot.receive(event)))
  }

  function load (plugin: string | Plugin) {
    if (typeof plugin === 'string') {
      plugin = <Plugin> resolve(plugin)
    }

    const robot = createRobot({app, cache, catchErrors: true})

    // Connect the router from the robot to the server
    server.use(robot.router)

    // Initialize the plugin
    plugin(robot)
    robots.push(robot)

    return robot
  }

  function setup (apps: Array<string | Plugin>) {
    // Log all unhandled rejections
    process.on('unhandledRejection', errorHandler)

    // Load the given apps along with the default apps
    apps.concat(defaultApps).forEach(app => load(app))

    // Register error handler as the last middleware
    server.use(logRequestErrors)
  }

  return {
    server,
    webhook,
    receive,
    logger,
    load,
    setup,

    start () {
      if (options.webhookProxy) {
        createWebhookProxy({
          url: options.webhookProxy,
          port: options.port,
          path: options.webhookPath,
          logger
        })
      }

      server.listen(options.port)
      logger.info('Listening on http://localhost:' + options.port)
    }
  }
}

module.exports.createRobot = createRobot

export type Plugin = (robot: Robot) => void

export interface Options {
  webhookPath?: string
  secret?: string,
  id: string,
  cert: string,
  webhookProxy?: string,
  port?: number
}

export interface Probot {
  server: express.Application
  webhook: any
  receive: (event: WebhookEvent) => Promise<any[]>
  logger: Logger
  load: (plugin: string | Plugin) => Robot
  setup: (apps: Array<string | Plugin>) => void
  start: () => void
}

export { Logger, Context, Robot }
