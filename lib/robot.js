const GitHubApi = require('github');
const Bottleneck = require('bottleneck');
const Context = require('./context');

class Robot {
  constructor({integration, webhook, cache, logger}) {
    this.integration = integration;
    this.webhook = webhook;
    this.cache = cache;
    this.log = wrapLogger(logger);

    this.webhook.on('*', event => this.log.trace(event, 'webhook received'));
  }

  on(event, callback) {
    const [name, action] = event.split('.');

    return this.webhook.on(name, event => {
      if (!action || action === event.payload.action) {
        callback(event, new Context(event));
      }
    });
  }

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
