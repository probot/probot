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

class Robot {
  constructor(integration, webhook, cache) {
    this.integration = integration;
    this.webhook = webhook;
    this.cache = cache;
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
