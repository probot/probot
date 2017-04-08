const cacheManager = require('cache-manager');
const createWebhook = require('github-webhook-handler');
const createIntegration = require('github-integration');
const Raven = require('raven');
const createRobot = require('./lib/robot');
const createServer = require('./lib/server');

module.exports = options => {
  const cache = cacheManager.caching({
    store: 'memory',
    ttl: 60 * 60 // 1 hour
  });

  const webhook = createWebhook({path: '/', secret: options.secret});
  const integration = createIntegration({
    id: options.id,
    cert: options.cert,
    debug: process.env.LOG_LEVEL === 'trace'
  });
  const server = createServer(webhook);
  const robot = createRobot(integration, webhook, cache);

  if (process.env.SENTRY_URL) {
    Raven.config(process.env.SENTRY_URL, {
      captureUnhandledRejections: true
    }).install({});
  }

  // Handle case when webhook creation fails
  webhook.on('error', err => {
    Raven.captureException(err);
    robot.log.error(err);
  });

  return {
    server,
    robot,

    start() {
      server.listen(options.port);
      robot.log.trace('Listening on http://localhost:' + options.port);
    },

    load(plugin) {
      plugin(robot);
    }
  };
};
