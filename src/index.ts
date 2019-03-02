import OctokitApp from '@octokit/app'
import Octokit from '@octokit/rest'
import Webhooks from '@octokit/webhooks'
import Bottleneck from 'bottleneck'
import Logger from 'bunyan'
import express from 'express'
import Redis from 'ioredis'

import { Server } from 'http'
import { Application } from './application'
import setupApp from './apps/setup'
import { createDefaultCache } from './cache'
import { Context } from './context'
import { ProbotOctokit } from './github'
import { logger } from './logger'
import { logRequestErrors } from './middleware/log-request-errors'
import { findPrivateKey } from './private-key'
import { resolve } from './resolver'
import { createServer } from './server'
import { createWebhookProxy } from './webhook-proxy'

const cache = createDefaultCache()

// tslint:disable:no-var-requires
const defaultAppFns: ApplicationFunction[] = [
  require('./apps/default'),
  require('./apps/sentry'),
  require('./apps/stats')
]
// tslint:enable:no-var-requires

export class Probot {
  public static async run (appFn: ApplicationFunction | string[]) {
    require('dotenv').config()

    const pkgConf = require('pkg-conf')
    const program = require('commander')

    const readOptions = (): Options => {
      if (Array.isArray(appFn)) {
        program
          .usage('[options] <apps...>')
          .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
          .option('-W, --webhook-proxy <url>', 'URL of the webhook proxy service.`', process.env.WEBHOOK_PROXY_URL)
          .option('-w, --webhook-path <path>', 'URL path which receives webhooks. Ex: `/webhook`', process.env.WEBHOOK_PATH)
          .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
          .option('-s, --secret <secret>', 'Webhook secret of the GitHub App', process.env.WEBHOOK_SECRET)
          .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', process.env.PRIVATE_KEY_PATH)
          .parse(appFn)

        return {
          cert: findPrivateKey(program.privateKey) || undefined,
          id: program.app,
          port: program.port,
          secret: program.secret,
          webhookPath: program.webhookPath,
          webhookProxy: program.webhookProxy
        }
      }
      const privateKey = findPrivateKey()
      return {
        cert: (privateKey && privateKey.toString()) || undefined,
        id: Number(process.env.APP_ID),
        port: Number(process.env.PORT) || 3000,
        secret: process.env.WEBHOOK_SECRET,
        webhookPath: process.env.WEBHOOK_PATH,
        webhookProxy: process.env.WEBHOOK_PROXY_URL
      }
    }

    const options = readOptions()
    const probot = new Probot(options)
    if (!options.id || !options.cert) {
      probot.load(setupApp)
    } else if (Array.isArray(appFn)) {
      const pkg = await pkgConf('probot')
      probot.setup(program.args.concat(pkg.apps || pkg.plugins || []))
    } else {
      probot.load(appFn)
    }
    probot.start()

    return probot
  }

  public server: express.Application
  public httpServer?: Server
  public webhook: Webhooks
  public logger: Logger
  // These 3 need to be public for the tests to work.
  public options: Options
  public app?: OctokitApp
  public throttleOptions: any

  private apps: Application[]
  private githubToken?: string
  private Octokit: Octokit.Static

  constructor (options: Options) {
    options.webhookPath = options.webhookPath || '/'
    options.secret = options.secret || 'development'
    this.options = options
    this.logger = logger
    this.apps = []
    this.webhook = new Webhooks({
      path: options.webhookPath,
      secret: options.secret
    })
    this.githubToken = options.githubToken
    this.Octokit = options.Octokit || ProbotOctokit
    if (this.options.id) {
      if (process.env.GHE_HOST && /^https?:\/\//.test(process.env.GHE_HOST)) {
        throw new Error('Your \`GHE_HOST\` environment variable should not begin with https:// or http://')
      }

      this.app = new OctokitApp({
        baseUrl: process.env.GHE_HOST && `https://${process.env.GHE_HOST}/api/v3`,
        id: options.id as number,
        privateKey: options.cert as string
      })
    }
    this.server = createServer({ webhook: (this.webhook as any).middleware, logger })

    // Log all received webhooks
    this.webhook.on('*', async (event: Webhooks.WebhookEvent<any>) => {
      try {
        await this.receive(event)
      } catch {
        // Errors have already been logged.
      }
    })

    // Log all webhook errors
    this.webhook.on('error', this.errorHandler)

    if (options.redisConfig || process.env.REDIS_URL) {
      let client
      if (options.redisConfig) {
        client = new Redis(options.redisConfig)
      } else if (process.env.REDIS_URL) {
        client = new Redis(process.env.REDIS_URL)
      }
      const connection = new Bottleneck.IORedisConnection({ client })
      connection.on('error', this.logger.error)

      this.throttleOptions = {
        Bottleneck,
        connection
      }
    }
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

  public receive (event: Webhooks.WebhookEvent<any>) {
    this.logger.debug({ event }, 'Webhook received')
    return Promise.all(this.apps.map(app => app.receive(event)))
  }

  public load (appFn: string | ApplicationFunction) {
    if (typeof appFn === 'string') {
      appFn = resolve(appFn) as ApplicationFunction
    }
    const app = new Application({
      Octokit: this.Octokit,
      app: this.app as OctokitApp,
      cache,
      githubToken: this.githubToken,
      throttleOptions: this.throttleOptions
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

    this.httpServer = this.server.listen(this.options.port)
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
  port?: number,
  redisConfig?: Redis.RedisOptions,
  Octokit?: Octokit.Static
}

export { Logger, Context, Application, Octokit }
