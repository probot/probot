import * as cacheManager from 'cache-manager'
import {createApp} from './github-app'
import {createRobot, Robot} from './robot'
import {createServer} from './server'
import {resolve} from './resolver'
import {logger} from './logger'
import {createWebhookProxy} from './webhook-proxy'
import * as express from 'express'
import * as Logger from 'bunyan'

const createWebhook = require('github-webhook-handler')
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

  const webhook = createWebhook({path: options.webhookPath, secret: options.secret})
  const app = createApp({
    id: options.id,
    cert: options.cert
  })
  const server: express.Application = createServer({webhook, logger})

  // Log all received webhooks
  webhook.on('*', (event: any) => {
    logger.info({event}, 'Webhook received')
    receive(event)
  })

  // Log all webhook errors
  webhook.on('error', logger.error.bind(logger))

  const robots: Array<Robot> = []

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
    process.on('unhandledRejection', logger.error.bind(logger))

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

export interface Plugin { (robot: Robot): void }

export interface Options {
  webhookPath?: string
  secret?: string,
  id: string,
  cert: string,
  webhookProxy?: string,
  port?: number
}

export { Logger }
