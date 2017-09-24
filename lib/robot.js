const {EventEmitter} = require('promise-events')
const express = require('express')

/**
 * The `robot` parameter available to apps
 *
 * @property {logger} log - A logger
 */
class Robot {
  constructor ({logger, router, catchErrors} = {}) {
    this.events = new EventEmitter()
    this.router = router || new express.Router()
    this.log = wrapLogger(logger)
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

    return this.events.on(name, async context => {
      if (!action || action === context.payload.action) {
        try {
          await callback(context)
        } catch (err) {
          this.log.error({err, event: context})
          if (!this.catchErrors) {
            throw err
          }
        }
      }
    })
  }
}

// Return a function that defaults to "debug" level, and has properties for
// other levels:
//
//     robot.log("debug")
//     robot.log.trace("verbose details");
//
function wrapLogger (logger) {
  const fn = logger ? logger.debug.bind(logger) : function () { };

  // Add level methods on the logger
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
    fn[level] = logger ? logger[level].bind(logger) : function () { }
  })

  return fn
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

 /**
  * A logger backed by [bunyan](https://github.com/trentm/node-bunyan)
  *
  * The default log level is `debug`, but you can change it by setting the
  * `LOG_LEVEL` environment variable to `trace`, `info`, `warn`, `error`, or
  * `fatal`.
  *
  * @typedef logger
  *
  * @example
  *
  * robot.log("This is a debug message");
  * robot.log.debug("…so is this");
  * robot.log.trace("Now we're talking");
  * robot.log.info("I thought you should know…");
  * robot.log.warn("Woah there");
  * robot.log.error("ETOOMANYLOGS");
  * robot.log.fatal("Goodbye, cruel world!");
  *
  * Note: Probot supports execption tracking through raven, a client for
  * [sentry](https://github.com/getsentry/sentry). If the `SENTRY_DSN` is set
  * as an environment variable, all errors will be forwarded to the sentry host
  * specified by the environment variable.
  */
