import * as express from 'express'
import {EventEmitter} from 'promise-events'
import {Context} from './context'
import {GitHubApp} from './github-app'
import {logger} from './logger'
import {LoggerWithTarget, wrapLogger} from './wrap-logger'

/**
 * The `app` parameter available to apps
 *
 * @property {logger} log - A logger
 */
export class Application {
  public events: EventEmitter
  public adapter: GitHubApp
  public router: express.Router
  public catchErrors?: boolean
  public log: LoggerWithTarget

  constructor (options: Options) {
    const opts = options || {}
    this.events = new EventEmitter()
    this.log = wrapLogger(logger, logger)
    this.adapter = opts.adapter
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
        try {
          await callback(await this.adapter.createContext(event))
        } catch (err) {
          this.log.error({err, event, id: event.id})
          if (!this.catchErrors) {
            throw err
          }
        }
      })
    } else {
      eventName.forEach(e => this.on(e, callback))
    }
  }
}

export interface WebhookEvent {
  event: string
  id: number
  payload: any
  protocol?: 'http' | 'https'
  host?: string
  url?: string
}

export interface Options {
  adapter: GitHubApp
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
