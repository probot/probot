import { WebhookEvent } from '@octokit/webhooks'
import express from 'express'
import { EventEmitter } from 'promise-events'
import { ApplicationFunction } from '.'
import { Cache } from './cache'
import { Context } from './context'
import { GitHubAPI } from './github'
import { logger } from './logger'
import { LoggerWithTarget, wrapLogger } from './wrap-logger'

export interface Options {
  app: () => string
  cache: Cache
  router?: express.Router
  catchErrors?: boolean
  githubToken?: string
}

// Some events can't get an authenticated client (#382):
function isUnauthenticatedEvent (event: WebhookEvent) {
  return !event.payload.installation ||
    (event.name === 'installation' && event.payload.action === 'deleted')
}

/**
 * The `app` parameter available to `ApplicationFunction`s
 *
 * @property {logger} log - A logger
 */
export class Application {
  public events: EventEmitter
  public app: () => string
  public cache: Cache
  public router: express.Router
  public log: LoggerWithTarget

  private githubToken?: string

  constructor (options?: Options) {
    const opts = options || {} as any
    this.events = new EventEmitter()
    this.log = wrapLogger(logger, logger)
    this.app = opts.app
    this.cache = opts.cache
    this.router = opts.router || express.Router() // you can do this?
    this.githubToken = opts.githubToken

    if (opts.catchErrors) {
      // Deprecated since 7.2.0
      // tslint:disable-next-line:no-console
      console.warn(new Error('Property `catchErrors` is deprecated and has no effect'))
    }
  }

  /**
   * Loads an ApplicationFunction into the current Application
   * @param appFn - Probot application function to load
   */
  public load (appFn: ApplicationFunction | ApplicationFunction[]): Application {
    if (Array.isArray(appFn)) {
      appFn.forEach(a => this.load(a))
    } else {
      appFn(this)
    }

    return this
  }

  public async receive (event: WebhookEvent) {
    if ((event as any).event) {
      // tslint:disable-next-line:no-console
      console.warn(new Error('Property `event` is deprecated, use `name`'))
      event = { name: (event as any).event, ...event }
    }

    return Promise.all([
      this.events.emit('*', event),
      this.events.emit(event.name, event),
      this.events.emit(`${ event.name }.${ event.payload.action }`, event)
    ])
  }

  /**
   * Get an {@link http://expressjs.com|express} router that can be used to
   * expose HTTP endpoints
   *
   * ```
   * module.exports = app => {
   *   // Get an express router to expose new HTTP endpoints
   *   const route = app.route('/my-app');
   *
   *   // Use any middleware
   *   route.use(require('express').static(__dirname + '/public'));
   *
   *   // Add a new route
   *   route.get('/hello-world', (req, res) => {
   *     res.end('Hello World');
   *   });
   * };
   * ```
   *
   * @param path - the prefix for the routes
   * @returns an [express.Router](http://expressjs.com/en/4x/api.html#router)
   */
  public route (path?: string): express.Router {
    if (path) {
      const router = express.Router()
      this.router.use(path, router)
      return router
    } else {
      return this.router
    }
  }

  /**
   * Listen for [GitHub webhooks](https://developer.github.com/webhooks/),
   * which are fired for almost every significant action that users take on
   * GitHub.
   *
   * @param event - the name of the [GitHub webhook
   * event](https://developer.github.com/webhooks/#events). Most events also
   * include an "action". For example, the * [`issues`](
   * https://developer.github.com/v3/activity/events/types/#issuesevent)
   * event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`,
   * `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`.
   * Often, your bot will only care about one type of action, so you can append
   * it to the event name with a `.`, like `issues.closed`.
   *
   * ```js
   * app.on('push', context => {
   *   // Code was just pushed.
   * });
   *
   * app.on('issues.opened', context => {
   *   // An issue was just opened.
   * });
   * ```
   *
   * @param callback - a function to call when the
   * webhook is received.
   */
  public on (eventName: string | string[], callback: (context: Context) => Promise<void>) {
    if (typeof eventName === 'string') {

      return this.events.on(eventName, async (event: WebhookEvent) => {
        const log = this.log.child({ name: 'event', id: event.id })

        try {
          const github = await this.authenticateEvent(event, log)
          const context = new Context(event, github, log)

          await callback(context)
        } catch (err) {
          log.error({ err, event })
          throw err
        }
      })
    } else {
      eventName.forEach(e => this.on(e, callback))
    }
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
   * ```js
   *  module.exports = (app) => {
   *    app.on('issues.opened', async context => {
   *      const github = await app.auth();
   *    });
   *  };
   * ```
   *
   * @param id - ID of the installation, which can be extracted from
   * `context.payload.installation.id`. If called without this parameter, the
   * client wil authenticate [as the app](https://developer.github.com/apps/building-integrations/setting-up-and-registering-github-apps/about-authentication-options-for-github-apps/#authenticating-as-a-github-app)
   * instead of as a specific installation, which means it can only be used for
   * [app APIs](https://developer.github.com/v3/apps/).
   *
   * @returns An authenticated GitHub API client
   * @private
   */
  public async auth (id?: number, log = this.log): Promise<GitHubAPI> {
    if (process.env.GHE_HOST && /^https?:\/\//.test(process.env.GHE_HOST)) {
      throw new Error('Your \`GHE_HOST\` environment variable should not begin with https:// or http://')
    }

    // if installation ID passed, instantiate and authenticate Octokit, then cache the instance
    // so that it can be used across received webhook events.
    if (id) {
      // Cache for 1 minute less than GitHub expiry
      const installationTokenTTL = parseInt(process.env.INSTALLATION_TOKEN_TTL || '3540', 10)

      return this.cache.wrap(`app:${id}`, async () => {
        const installation = GitHubAPI({
          baseUrl: process.env.GHE_HOST && `https://${process.env.GHE_HOST}/api/v3`,
          debug: process.env.LOG_LEVEL === 'trace',
          logger: log.child({ name: 'github', installation: String(id) })
        })

        log.trace(`creating token for installation`)
        installation.authenticate({ type: 'app', token: this.app() })

        const response = await installation.apps.createInstallationToken({ installation_id: id })
        installation.authenticate({ type: 'token', token: response.data.token })
        return installation
      }, { ttl: installationTokenTTL })
    }

    const github = GitHubAPI({
      baseUrl: process.env.GHE_HOST && `https://${process.env.GHE_HOST}/api/v3`,
      debug: process.env.LOG_LEVEL === 'trace',
      logger: log.child({ name: 'github', installation: String(id) })
    })

    github.authenticate({
      token: this.githubToken ? this.githubToken : this.app(),
      type: 'app'
    })

    return github
  }

  private authenticateEvent (event: WebhookEvent, log: LoggerWithTarget): Promise<GitHubAPI> {
    if (this.githubToken) {
      return this.auth()
    }

    if (isUnauthenticatedEvent(event)) {
      log.debug('`context.github` is unauthenticated. See https://probot.github.io/docs/github-api/#unauthenticated-events')
      return this.auth()
    }

    return this.auth(event.payload.installation!.id, log)
  }
}
