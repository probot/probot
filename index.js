require('dotenv').config({silent: true});

const process = require('process');
const createWebhook = require('github-webhook-handler');

const log = require('./lib/log');
const robot = require('./lib/robot');
const createServer = require('./lib/server');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'development';
const PORT = process.env.PORT || 3000;

const webhook = createWebhook({path: '/', secret: WEBHOOK_SECRET});
const server = createServer(webhook);

// Show trace for any unhandled rejections
process.on('unhandledRejection', reason => {
  log.error(reason);
});

robot.listen(webhook);
server.listen(PORT);

console.log('Listening on http://localhost:' + PORT);
