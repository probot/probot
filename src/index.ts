// tslint:disable-next-line: no-var-requires
require('dotenv').config()

// TODO: remove in v11
if ('DISABLE_STATS' in process.env) {
  // tslint:disable:no-console
  console.warn('[probot] "DISABLE_STATS" is no longer used since v10')
}
if ('IGNORED_ACCOUNTS' in process.env) {
  // tslint:disable:no-console
  console.warn('[probot] "IGNORED_ACCOUNTS" is no longer used since v10')
}

import { Webhooks } from '@octokit/webhooks'
import Bottleneck from 'bottleneck'
import Logger from 'bunyan'
import express from 'express'
import Redis from 'ioredis'
import LRUCache from 'lru-cache'

import { Server } from 'http'
import { Application } from './application'
import setupApp from './apps/setup'
import { Context } from './context'
import { ProbotOctokit, ProbotOctokitCore } from './github/octokit'
import { logger } from './logger'
import { logRequestErrors } from './middleware/log-request-errors'
import { findPrivateKey } from './private-key'
import { resolve } from './resolver'
import { createServer } from './server'
import { createWebhookProxy } from './webhook-proxy'

// tslint:disable:no-var-requires
const defaultAppFns: ApplicationFunction[] = [
  require('./apps/default'),
  require('./apps/sentry')
]
// tslint:enable:no-var-requires

export class Probot {
  public static async run (appFn: ApplicationFunction | string[]) {
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
      if (process.env.NODE_ENV === 'production') {
        if (!options.id) {
          throw new Error(
            'Application ID is missing, and is required to run in production mode. ' +
            'To resolve, ensure the APP_ID environment variable is set.'
          )
        } else if (!options.cert) {
          throw new Error(
            'Certificate is missing, and is required to run in production mode. ' +
            'To resolve, ensure either the PRIVATE_KEY or PRIVATE_KEY_PATH environment variable is set and contains a valid certificate'
          )
        }
      }
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
  public throttleOptions: any

  private apps: Application[]
  private githubToken?: string
  private Octokit: typeof ProbotOctokit
  private cache: LRUCache<number, string>

  constructor (options: Options) {
    if (process.env.GHE_HOST && /^https?:\/\//.test(process.env.GHE_HOST)) {
      throw new Error('Your \`GHE_HOST\` environment variable should not begin with https:// or http://')
    }

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

    const Octokit = options.Octokit || ProbotOctokit
    this.Octokit = Octokit.defaults({
      baseUrl: process.env.GHE_HOST && `${process.env.GHE_PROTOCOL || 'https'}://${process.env.GHE_HOST}/api/v3`
    })

    this.server = createServer({ webhook: (this.webhook as any).middleware, logger })

    // TODO: support redis backend for access token cache if `options.redisConfig || process.env.REDIS_URL`
    this.cache = new LRUCache<number, string>({
      // cache max. 15000 tokens, that will use less than 10mb memory
      max: 15000,
      // Cache for 1 minute less than GitHub expiry
      maxAge: Number(process.env.INSTALLATION_TOKEN_TTL) || 1000 * 60 * 59
    })

    // Log all received webhooks
    this.webhook.on('*', async (event: Webhooks.WebhookEvent<any>) => {
      await this.receive(event)
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
    const errMessage = (err.message || '').toLowerCase()
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
      cache: this.cache,
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
    (process as NodeJS.EventEmitter).on('unhandledRejection', this.errorHandler)

    // Load the given appFns along with the default ones
    appFns.concat(defaultAppFns).forEach(appFn => this.load(appFn))

    // Register error handler as the last middleware
    this.server.use(logRequestErrors)
  }

  public start () {
    return this.httpServer = this.server.listen(this.options.port, () => {
      if (this.options.webhookProxy) {
        createWebhookProxy({
          logger,
          path: this.options.webhookPath,
          port: this.options.port,
          url: this.options.webhookProxy
        })
      }
      logger.info('Listening on http://localhost:' + this.options.port)
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${this.options.port} is already in use. You can define the PORT environment variable to use a different port.`)
      } else {
        logger.error(err)
      }
      process.exit(1)
    })
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
  Octokit?: typeof ProbotOctokit
}

export { Logger, Context, Application, ProbotOctokit, ProbotOctokitCore }
