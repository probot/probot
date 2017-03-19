const createWebhook = require('github-webhook-handler');
const createIntegration = require('github-integration');
const createRobot = require('./lib/robot');
const createServer = require('./lib/server');

module.exports = options => {
  const webhook = createWebhook({path: '/', secret: options.secret});
  const integration = createIntegration({
    id: options.id,
    cert: options.cert,
    debug: process.env.LOG_LEVEL === 'trace'
  });
  const server = createServer(webhook);
  const robot = createRobot(integration, webhook);

  // Show trace for any unhandled rejections
  process.on('unhandledRejection', reason => {
    robot.log.error(reason);
  });

  // Handle case when webhook creation fails
  webhook.on('error', err => {
    robot.log.error(err);
  });

  return {
    server,
    robot,

    start() {
      server.listen(options.port);
      console.log('Listening on http://localhost:' + options.port);
    },

    load(plugin) {
      plugin(robot);
    }
  };
};
