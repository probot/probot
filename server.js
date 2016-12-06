require('dotenv').config({silent: true});

const process = require('process');
const http = require('http');
const createHandler = require('github-webhook-handler');
const log = require('./lib/log');
const robot = require('./lib/robot');

const PORT = process.env.PORT || 3000;
const webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'development'});

http.createServer((req, res) => {
  webhook(req, res, err => {
    if (err) {
      log.error(err);
      res.statusCode = 500;
      res.end('Something has gone terribly wrong.');
    } else {
      res.statusCode = 404;
      res.end('no such location');
    }
  });
}).listen(PORT);

robot.listen(webhook);

// Show trace for any unhandled rejections
process.on('unhandledRejection', reason => {
  log.error(reason);
});

console.log('Listening on http://localhost:' + PORT);
