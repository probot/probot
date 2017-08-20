const {EventEmitter} = require('promise-events');
const GitHubApi = require('github');
const Bottleneck = require('bottleneck');
const express = require('express');
const Context = require('./context');

/**
 * The `robot` parameter available to apps
 *
 * @property {logger} log - A logger
 */
class Robot {
  constructor({app, cache, logger, router, catchErrors} = {}) {
    this.events = new EventEmitter();
    this.app = app;
    this.cache = cache;
    this.router = router || new express.Router();
    this.log = wrapLogger(logger);
    this.catchErrors = catchErrors;
  }

  async receive(event) {
    return this.events.emit('*', event).then(() => {
      return this.events.emit(event.event, event);
    });
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
  route(path) {
    if (path) {
      const router = new express.Router();
      this.router.use(path, router);
      return router;
    } else {
      return this.router;
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
  on(event, callback) {
    if (callback.length === 2) {
      const caller = (new Error()).stack.split('\n')[2];
      console.warn('DEPRECATED: Event callbacks now only take a single `context` argument.');
      console.warn(caller);
    }

    const [name, action] = event.split('.');

    return this.events.on(name, async event => {
      if (!action || action === event.payload.action) {
        try {
          const github = await this.auth(event.payload.installation.id);
          const context = new Context(event, github);
          await callback(context, context /* DEPRECATED: for backward compat */);
        } catch (err) {
          this.log.error({err, event});
          if (!this.catchErrors) {
            throw err;
          }
        }
      }
    });
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
  async auth(id) {
    let github;

    if (id) {
      const res = await this.cache.wrap(`app:${id}:token`, () => {
        this.log.trace(`creating token for installation ${id}`);
        return this.app.createToken(id);
      }, {ttl: 60 * 59}); // Cache for 1 minute less than GitHub expiry

      github = new GitHubApi({debug: process.env.LOG_LEVEL === 'trace'});
      github.authenticate({type: 'token', token: res.data.token});
    } else {
      github = await this.app.asApp();
    }

    return probotEnhancedClient(github);
  }
}

function probotEnhancedClient(github) {
  github = rateLimitedClient(github);

  github.paginate = require('./paginate');

  return github;
}

// Hack client to only allow one request at a time with a 1s delay
// https://github.com/mikedeboer/node-github/issues/526
function rateLimitedClient(github) {
  const limiter = new Bottleneck(1, 1000);
  const oldHandler = github.handler;
  github.handler = (msg, block, callback) => {
    limiter.submit(oldHandler.bind(github), msg, block, callback);
  };
  return github;
}

// Return a function that defaults to "debug" level, and has properties for
// other levels:
//
//     robot.log("debug")
//     robot.log.trace("verbose details");
//
function wrapLogger(logger) {
  const fn = logger ? logger.debug.bind(logger) : function () { };

  // Add level methods on the logger
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
    fn[level] = logger ? logger[level].bind(logger) : function () { };
  });

  return fn;
}

module.exports = (...args) => new Robot(...args);

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
 * the [github Node.js module](https://github.com/mikedeboer/node-github),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/mikedeboer/node-github}
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
  */
