const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');
const sentryStream = require('bunyan-sentry-stream');
const cacheManager = require('cache-manager');
const createIntegration = require('github-integration');
const createWebhook = require('github-webhook-handler');
const Raven = require('raven');

const createRobot = require('./lib/robot');
const createServer = require('./lib/server');

module.exports = options => {
  const cache = cacheManager.caching({
    store: 'memory',
    ttl: 60 * 60 // 1 hour
  });

  const logger = bunyan.createLogger({
    name: 'PRobot',
    level: process.env.LOG_LEVEL || 'debug',
    stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'})
  });

  const webhook = createWebhook({path: '/', secret: options.secret});
  const integration = createIntegration({
    id: options.id,
    cert: options.cert,
    debug: process.env.LOG_LEVEL === 'trace'
  });
  const server = createServer(webhook);
  const robot = createRobot({integration, webhook, cache, logger});

  if (process.env.SENTRY_URL) {
    Raven.config(process.env.SENTRY_URL, {
      captureUnhandledRejections: true,
      autoBreadcrumbs: true
    }).install({});

    logger.addStream(sentryStream(Raven));
  }

  // Handle case when webhook creation fails
  webhook.on('error', err => {
    logger.error(err);
  });

  return {
    server,
    robot,

    start() {
      server.listen(options.port);
      logger.trace('Listening on http://localhost:' + options.port);
    },

    load(plugin) {
      plugin(robot);
    }
  };
};
