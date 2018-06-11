import Webhooks from '@octokit/webhooks'
import cacheManager from 'cache-manager'
import jwt from 'jsonwebtoken'
import {WebhookEvent} from './application'
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
    (event.event === 'installation' && event.payload.action === 'deleted')
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
}
