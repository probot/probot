import Webhooks, {WebhookEvent} from '@octokit/webhooks'
import cacheManager from 'cache-manager'
import {Application} from 'express'
import jwt from 'jsonwebtoken'
import {Context} from './context'
import {GitHubAPI} from './github'
import {logger} from './logger'
import {LoggerWithTarget, wrapLogger} from './wrap-logger'

const cache = cacheManager.caching({
  store: 'memory',
  ttl: 60 * 60 // 1 hour
})

// Some events can't get an authenticated client (#382):
function isUnauthenticatedEvent (event: WebhookEvent) {
  return !event.payload.installation ||
    (event.name === 'installation' && event.payload.action === 'deleted')
}

export interface Options {
  id: number
  cert: string
  webhookPath?: string,
  secret?: string
}

export class GitHubApp {
  public log: LoggerWithTarget
  public id: number
  public cert: string
  public webhooks: Webhooks

  constructor({id, cert, webhookPath, secret}: Options) {
    this.id = id
    this.cert = cert
    this.log = wrapLogger(logger, logger)

    this.webhooks = new Webhooks({
      path: webhookPath || '/',
      secret: secret || 'development'
    })

    // Log all webhook errors
    this.webhooks.on('error', this.errorHandler.bind(this))
  }

  get router(): Application {
    return this.webhooks.middleware
  }

  public jwt() {
    const payload = {
      exp: Math.floor(Date.now() / 1000) + 60,  // JWT expiration time
      iat: Math.floor(Date.now() / 1000),       // Issued at time
      iss: this.id                           // GitHub App ID
    }

    // Sign with RSA SHA256
    return jwt.sign(payload, this.cert, {algorithm: 'RS256'})
  }

  public async createContext (event: WebhookEvent) {
    const log = this.log.child({name: 'event', id: event.id})

    let github

    if (isUnauthenticatedEvent(event)) {
      github = await this.auth()
      log.debug('`context.github` is unauthenticated. See https://probot.github.io/docs/github-api/#unauthenticated-events')
    } else {
      github = await this.auth(event.payload.installation.id, log)
    }

    return new Context(event, github, log)
  }

  /**
   * Authenticate and get a GitHub client that can be used to make API calls.
   *
   * You'll probably want to use `context.github` instead.
   *
   * **Note**: `app.auth` is asynchronous, so it needs to be prefixed with a
   * [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
   * to wait for the magic to happen.
   *
   * @example
   *
   *  module.exports = (app) => {
   *    app.on('issues.opened', async context => {
   *      const github = await app.auth();
   *    });
   *  };
   *
   * @param {number} [id] - ID of the installation, which can be extracted from
   * `context.payload.installation.id`. If called without this parameter, the
   * client wil authenticate [as the app](https://developer.github.com/apps/building-integrations/setting-up-and-registering-github-apps/about-authentication-options-for-github-apps/#authenticating-as-a-github-app)
   * instead of as a specific installation, which means it can only be used for
   * [app APIs](https://developer.github.com/v3/apps/).
   *
   * @returns {Promise<github>} - An authenticated GitHub API client
   * @private
   */
  public async auth (id?: number, log = this.log): Promise<GitHubAPI> {
    const github = GitHubAPI({
      baseUrl: process.env.GHE_HOST && `https://${process.env.GHE_HOST}/api/v3`,
      debug: process.env.LOG_LEVEL === 'trace',
      logger: log.child({name: 'github', installation: String(id)})
    })

    if (id) {
      const res = await cache.wrap(`app:${id}:token`, () => {
        log.trace(`creating token for installation`)
        github.authenticate({type: 'app', token: this.jwt()})

        return github.apps.createInstallationToken({installation_id: String(id)})
      }, {ttl: 60 * 59}) // Cache for 1 minute less than GitHub expiry

      github.authenticate({type: 'token', token: res.data.token})
    } else {
      github.authenticate({type: 'app', token: this.jwt()})
    }

    return github
  }

  public errorHandler (err: Error) {
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
}
