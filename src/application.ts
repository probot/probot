import * as express from 'express'
import {EventEmitter} from 'promise-events'
import {Context} from './context'
import {GitHubAPI} from './github'
import {logger} from './logger'
import {LoggerWithTarget, wrapLogger} from './wrap-logger'

// Some events can't get an authenticated client (#382):
function isUnauthenticatedEvent (context: Context) {
  return !context.payload.installation ||
    (context.event === 'installation' && context.payload.action === 'deleted')
}

/**
 * The `app` parameter available to apps
 *
 * @property {logger} log - A logger
 */
export class Application {
  public events: EventEmitter
  public app: () => string
  public cache: Cache
  public router: express.Router
  public catchErrors?: boolean
  public log: LoggerWithTarget

  constructor (options: Options) {
    const opts = options || {}
    this.events = new EventEmitter()
    this.log = wrapLogger(logger, logger)
    this.app = opts.app
    this.cache = opts.cache
    this.catchErrors = opts.catchErrors
    this.router = opts.router || express.Router() // you can do this?
  }

  public async receive (event: WebhookEvent) {
    return Promise.all([
      this.events.emit('*', event),
      this.events.emit(event.event, event),
      this.events.emit(`${event.event}.${event.payload.action}`, event),
    ])
  }

  /**
   * Get an {@link http://expressjs.com|express} router that can be used to
   * expose HTTP endpoints
   *
   * @example
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
   *
   * @param {string} path - the prefix for the routes
   * @returns {@link http://expressjs.com/en/4x/api.html#router|express.Router}
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
   * @param {string} event - the name of the [GitHub webhook
   * event](https://developer.github.com/webhooks/#events). Most events also
   * include an "action". For example, the * [`issues`](
   * https://developer.github.com/v3/activity/events/types/#issuesevent)
   * event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`,
   * `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`.
   * Often, your bot will only care about one type of action, so you can append
   * it to the event name with a `.`, like `issues.closed`.
   *
   * @param {Application~webhookCallback} callback - a function to call when the
   * webhook is received.
   *
   * @example
   *
   * app.on('push', context => {
   *   // Code was just pushed.
   * });
   *
   * app.on('issues.opened', context => {
   *   // An issue was just opened.
   * });
   */
  public on (eventName: string | string[], callback: (context: Context) => void) {
    if (typeof eventName === 'string') {

      return this.events.on(eventName, async (event: Context) => {
        const log = this.log.child({name: 'event', id: event.id})

        try {
          let github

          if (isUnauthenticatedEvent(event)) {
            github = await this.auth()
            log.debug('`context.github` is unauthenticated. See https://probot.github.io/docs/github-api/#unauthenticated-events')
          } else {
            github = await this.auth(event.payload.installation.id, log)
          }

          const context = new Context(event, github, log)

          await callback(context)
        } catch (err) {
          log.error({err, event})
          if (!this.catchErrors) {
            throw err
          }
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
      const res = await this.cache.wrap(`app:${id}:token`, () => {
        log.trace(`creating token for installation`)
        github.authenticate({type: 'app', token: this.app()})

        return github.apps.createInstallationToken({installation_id: String(id)})
      }, {ttl: 60 * 59}) // Cache for 1 minute less than GitHub expiry

      github.authenticate({type: 'token', token: res.data.token})
    } else {
      github.authenticate({type: 'app', token: this.app()})
    }

    return github
  }
}

export interface WebhookEvent {
  event: string
  id: number
  payload: any
  protocol: 'http' | 'https'
  host: string
  url: string
}

// The TypeScript definition for cache-manager does not export the Cache interface so we recreate it here
export interface Cache {
  wrap<T>(key: string, wrapper: (callback: (error: any, result: T) => void) => any, options: CacheConfig): Promise<any>;
}
export interface CacheConfig {
    ttl: number;
}

export interface Options {
  app: () => string
  cache: Cache
  router?: express.Router
  catchErrors: boolean
}

/**
 * Do the thing
 * @callback Application~webhookCallback
 * @param {Context} context - the context of the event that was triggered,
 *   including `context.payload`, and helpers for extracting information from
 *   the payload, which can be passed to GitHub API calls.
 *
 *  ```js
 *  module.exports = app => {
 *    app.on('push', context => {
 *      // Code was pushed to the repo, what should we do with it?
 *      app.log(context);
 *    });
 *  };
 *  ```
 */

/**
 * A [GitHub webhook event](https://developer.github.com/webhooks/#events) payload
 *
 * @typedef payload
 */
