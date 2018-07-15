import deprecated from 'deprecated-decorator'
import express from 'express'
import { EventEmitter } from 'promise-events'
import { ApplicationFunction } from '.'
import { Context, WebhookEvent } from './context'
import { GitHubAPI } from './github'
import { GitHubApp } from './github-app'
import { logger } from './logger'
import { LoggerWithTarget, wrapLogger } from './wrap-logger'

/**
 * The `app` parameter available to apps
 *
 * @property {logger} log - A logger
 */
export class Application {
  public events: EventEmitter
  public router: express.Router
  public catchErrors: boolean
  public log: LoggerWithTarget

  private github: GitHubApp

  constructor (options?: Options) {
    const opts = options || {} as any
    this.events = new EventEmitter()
    this.log = wrapLogger(logger, logger)
    this.github = opts.github
    this.catchErrors = opts.catchErrors || false
    this.router = opts.router || express.Router() // you can do this?
  }

  /**
   * Loads a Probot plugin
   * @param plugin - Probot plugin to load
   */
  public load (app: ApplicationFunction | ApplicationFunction[]): Application {
    if (Array.isArray(app)) {
      app.forEach(a => this.load(a))
    } else {
      app(this)
    }

    return this
  }

  public async receive (event: WebhookEvent) {
    return Promise.all([
      this.events.emit('*', event),
      this.events.emit(event.event, event),
      this.events.emit(`${event.event}.${event.payload.action}`, event)
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
        try {
          await callback(await this.github.createContext(event))
        } catch (err) {
          this.log.error({ err, event, id: event.id })
          if (!this.catchErrors) {
            throw err
          }
        }
      })
    } else {
      eventName.forEach(e => this.on(e, callback))
    }
  }

  @deprecated('github.jwt')
  public app (): string {
    return this.github.jwt()
  }

  @deprecated('github.auth')
  public auth (id?: number, log = this.log): Promise<GitHubAPI> {
    return this.github.auth(id, log)
  }
}

export interface Options {
  github: GitHubApp
  router?: express.Router
  catchErrors?: boolean
}
