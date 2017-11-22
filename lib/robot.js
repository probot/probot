const EventHandler = require('@octokit/webhooks/event-handler')
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
    this.eventHandler = new EventHandler({
      transform: async (event) => {
        const github = await this.auth(event.payload.installation.id)
        const log = wrapLogger(logger.child({
          event: logger.serializers.event(event)
        }, true))
        return new Context(event, github, log)
      }
    })
    this.app = app
    this.cache = cache
    this.router = router || new express.Router()
    this.log = logger.wrap()
    this.catchErrors = catchErrors
    this.on = this.eventHandler.on
    this.removeListener = this.eventHandler.removeListener
  }

  /**
   *
   */
  async receive (event) {
    if (event.event) {
      console.log('DEPRECATED: robot.receive({event, payload}) is now robot.receive({name, payload})')
      event.name = event.event
    }

    return this.eventHandler.receive(event)
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
      host: process.env.GHE_HOST || 'api.github.com',
      pathPrefix: process.env.GHE_HOST ? '/api/v3' : '',
      logger: log.child({installation: id})
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
