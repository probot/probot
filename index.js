if(process.env.NODE_ENV != 'production') {
  require('dotenv-safe').load();
}

const fs = require('fs');
const createWebhook = require('github-webhook-handler');
const createIntegration = require('github-integration');

const log = require('./lib/log');
const createRobot = require('./lib/robot');
const createServer = require('./lib/server');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'development';
const PORT = process.env.PORT || 3000;

const webhook = createWebhook({path: '/', secret: WEBHOOK_SECRET});
const integration = createIntegration({
  id: process.env.INTEGRATION_ID,
  cert: process.env.PRIVATE_KEY || fs.readFileSync('private-key.pem'),
  debug: log.level() <= 10
});
const server = createServer(webhook);
const robot = createRobot(integration);

robot.listen(webhook);
server.listen(PORT);

console.log('Listening on http://localhost:' + PORT);

// Show trace for any unhandled rejections
process.on('unhandledRejection', reason => {
  log.error(reason);
});
