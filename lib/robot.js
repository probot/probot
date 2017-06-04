const GitHubApi = require('github');
const Bottleneck = require('bottleneck');
const Context = require('./context');

/**
 * The `robot` parameter available to plugins
 *
 * @property {logger} log - A logger
 */
class Robot {
  constructor({integration, webhook, cache, logger}) {
    this.integration = integration;
    this.webhook = webhook;
    this.cache = cache;
    this.log = wrapLogger(logger);

    this.webhook.on('*', event => this.log.trace(event, 'webhook received'));
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
   * robot.on('push', (event, context) => {
   *   // Code was just pushed.
   * });
   *
   * robot.on('issues.opened', (event, context) => {
   *   // An issue was just opened.
   * });
   */
  on(event, callback) {
    const [name, action] = event.split('.');

    return this.webhook.on(name, async event => {
      if (!action || action === event.payload.action) {
        const github = await this.auth(event.payload.installation.id);
        return callback(event, new Context(event, github));
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
   *    robot.on('issues.opened', async (event, context) => {
   *      const github = await robot.auth();
   *    });
   *  };
   *
   * @param {number} [id] - ID of the installation, which can be extracted from
   * `event.payload.installation.id`. If called without this parameter, the
   * client wil authenticate [as the integration](https://developer.github.com/early-access/integrations/authentication/#as-an-integration)
   * instead of as a specific installation, which means it can only be used for
   * [integration APIs](https://developer.github.com/v3/integrations/).
   *
   * @returns {Promise<github>} - An authenticated GitHub API client
   * @private
   */
  async auth(id) {
    let github;

    if (id) {
      const res = await this.cache.wrap(`integration:${id}:token`, () => {
        this.log.trace(`creating token for installation ${id}`);
        return this.integration.createToken(id);
      }, {ttl: 60 * 60});

      github = new GitHubApi({debug: process.env.LOG_LEVEL === 'trace'});
      github.authenticate({type: 'token', token: res.data.token});
    } else {
      github = await this.integration.asIntegration();
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
  const fn = logger.debug.bind(logger);

  // Add level methods on the logger
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
    fn[level] = logger[level].bind(logger);
  });

  return fn;
}

module.exports = (...args) => new Robot(...args);

/**
* Do the thing
* @callback Robot~webhookCallback
* @param {event} event - the event that was triggered, including `event.payload` which has
* @param {Context} context - helpers for extracting information from the event, which can be passed to GitHub API calls
*
*  ```js
*  module.exports = robot => {
*    robot.on('push', (event, context) => {
*      // Code was pushed to the repo, what should we do with it?
*      robot.log(event);
*    });
*  };
*  ```
*/

/**
 * A [GitHub webhook event](https://developer.github.com/webhooks/#events)
 *
 * @typedef event
 * @property {string} event - the name of the event that was triggered
 * @property {object} payload - the payload from the webhook
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
