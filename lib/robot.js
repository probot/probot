const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');
const GitHubApi = require('github');
const Bottleneck = require('bottleneck');
const Context = require('./context');

const logger = bunyan.createLogger({
  name: 'PRobot',
  level: process.env.LOG_LEVEL || 'debug',
  stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'})
});

/** The `robot` parameter available to plugins */
class Robot {
  constructor(integration, webhook, cache) {
    this.integration = integration;
    this.webhook = webhook;
    this.cache = cache;
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

    return this.webhook.on(name, event => {
      if (!action || action === event.payload.action) {
        callback(event, new Context(event));
      }
    });
  }

  /**
   * Authenticate as an installation and get a GitHub client that can be used
   * to make API calls.
   *
   *  **Note**: `robot.auth` is asynchronous, so it needs to be prefixed with a [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) to wait for the magic to happen.
   *
   * @example
   *
   *  module.exports = function(robot) {
   *    robot.on('issues.opened', async (event, context) => {
   *      const github = await robot.auth(event.payload.installation.id);
   *    });
   *  };
   *
   * @param {number} id - ID of the installation, which can be extracted from an event:
   * @returns {Promise<github>} - An authenticated GitHub API client
   */
  async auth(id) {
    let github;

    if (id) {
      const token = await this.cache.wrap(`integration:${id}:token`, () => {
        this.log.trace(`creating token for installation ${id}`);
        return this.integration.createToken(id);
      }, {ttl: 60 * 60});

      github = new GitHubApi({debug: process.env.LOG_LEVEL === 'trace'});
      github.authenticate({type: 'token', token: token.token});
    } else {
      github = await this.integration.asIntegration();
    }

    return probotEnhancedClient(github);
  }

  /**
   * A logger backed by [bunyan](https://github.com/trentm/node-bunyan)
   *
   * The default log level is `debug`, but you can change it by setting the
   * `LOG_LEVEL` environment variable to `trace`, `info`, `warn`, `error`, or
   * `fatal`.
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
  log(...args) {
    return logger.debug(...args);
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

// Add level methods on the logger
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
  Robot.prototype.log[level] = logger[level].bind(logger);
});

module.exports = (...args) => new Robot(...args);

/**
* Do the thing
* @callback Robot~webhookCallback
* @param {object} event - the event that was triggered, including `event.payload` which has
* @param {object} event.payload - the payload from the [GitHub webhook](https://developer.github.com/webhooks/#events)
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
 * the [github Node.js module](https://github.com/mikedeboer/node-github),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/mikedeboer/node-github}
 */
