const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');
const sentryStream = require('bunyan-sentry-stream');
const cacheManager = require('cache-manager');
const createApp = require('github-app');
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
    stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'}),
    serializers: {
      repository: repository => repository.full_name
    }
  });

  const webhook = createWebhook({path: '/', secret: options.secret});
  const app = createApp({
    id: options.id,
    cert: options.cert,
    debug: process.env.LOG_LEVEL === 'trace'
  });
  const server = createServer(webhook);
  const robot = createRobot({app, webhook, cache, logger});

  // Log all webhook errors
  webhook.on('error', logger.error.bind(logger));

  // Log all unhandled rejections
  process.on('unhandledRejection', logger.error.bind(logger));

  // If sentry is configured, report all logged errors
  if (process.env.SENTRY_URL) {
    Raven.disableConsoleAlerts();
    Raven.config(process.env.SENTRY_URL, {
      autoBreadcrumbs: true
    }).install({});

    logger.addStream(sentryStream(Raven));
  }

  return {
    server,
    robot,

    start() {
      server.listen(options.port);
      logger.trace('Listening on http://localhost:' + options.port);
    },

    load(plugin) {
      plugin(robot);
    },

    receive(event) {
      return webhook.emit(event.event, event);
    }
  };
};
