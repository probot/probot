const {EventEmitter} = require('promise-events')
const express = require('express')
const Context = require('./context')
const logger = require('./logger')
const GitHubApi = require('./github')

/**
 * The `robot` parameter available to apps
 *
 * @property {logger} log - A logger
 */
class Robot {
  constructor ({app, cache, router, catchErrors} = {}) {
    this.events = new EventEmitter()
    this.app = app
    this.cache = cache
    this.router = router || new express.Router()
    this.log = logger.wrap()
    this.catchErrors = catchErrors
  }

  async receive (event) {
    return this.events.emit('*', event).then(() => {
      return this.events.emit(event.event, event)
    })
  }

  /**
   * Get an {@link http://expressjs.com|express} router that can be used to
   * expose HTTP endpoints
   *
   * @example
   * module.exports = robot => {
   *   // Get an express router to expose new HTTP endpoints
   *   const app = robot.route('/my-app');
   *
   *   // Use any middleware
   *   app.use(require('express').static(__dirname + '/public'));
   *
   *   // Add a new route
   *   app.get('/hello-world', (req, res) => {
   *     res.end('Hello World');
   *   });
   * };
   *
   * @param {string} path - the prefix for the routes
   * @returns {@link http://expressjs.com/en/4x/api.html#router|express.Router}
   */
  route (path) {
    if (path) {
      const router = new express.Router()
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
   * @param {Robot~webhookCallback} callback - a function to call when the
   * webhook is received.
   *
   * @example
   *
   * robot.on('push', context => {
   *   // Code was just pushed.
   * });
   *
   * robot.on('issues.opened', context => {
   *   // An issue was just opened.
   * });
   */
  on (event, callback) {
    if (event.constructor === Array) {
      event.forEach(e => this.on(e, callback))
      return
    }

    const [name, action] = event.split('.')

    return this.events.on(name, async event => {
      if (!action || action === event.payload.action) {
        const log = this.log.child({name: 'event', id: event.id})

        try {
          const github = await this.auth(event.payload.installation.id, log)
          const context = new Context(event, github, log)

          await callback(context)
        } catch (err) {
          log.error({err, event})
          if (!this.catchErrors) {
            throw err
          }
        }
      }
    })
  }

  /**
   * Authenticate and get a GitHub client that can be used to make API calls.
   *
   * You'll probably want to use `context.github` instead.
   *
   * **Note**: `robot.auth` is asynchronous, so it needs to be prefixed with a
   * [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
   * to wait for the magic to happen.
   *
   * @example
   *
   *  module.exports = function(robot) {
   *    robot.on('issues.opened', async context => {
   *      const github = await robot.auth();
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
  async auth (id, log = this.log) {
    const github = new GitHubApi({
      debug: process.env.LOG_LEVEL === 'trace',
      baseUrl: process.env.GHE_HOST && `https://${process.env.GHE_HOST}/api/v3`,
      logger: log.child({name: 'github', installation: id})
    })

    if (id) {
      const res = await this.cache.wrap(`app:${id}:token`, () => {
        log.trace(`creating token for installation`)
        github.authenticate({type: 'integration', token: this.app()})

        return github.apps.createInstallationToken({installation_id: id})
      }, {ttl: 60 * 59}) // Cache for 1 minute less than GitHub expiry

      github.authenticate({type: 'token', token: res.data.token})
    } else {
      github.authenticate({type: 'integration', token: this.app()})
    }

    return github
  }
}

module.exports = (...args) => new Robot(...args)

/**
 * Do the thing
 * @callback Robot~webhookCallback
 * @param {Context} context - the context of the event that was triggered,
 *   including `context.payload`, and helpers for extracting information from
 *   the payload, which can be passed to GitHub API calls.
 *
 *  ```js
 *  module.exports = robot => {
 *    robot.on('push', context => {
 *      // Code was pushed to the repo, what should we do with it?
 *      robot.log(context);
 *    });
 *  };
 *  ```
 */

/**
 * A [GitHub webhook event](https://developer.github.com/webhooks/#events) payload
 *
 * @typedef payload
 */
