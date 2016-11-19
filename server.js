require('dotenv').config({silent: true});

const process = require('process');
const http = require('http');
const createHandler = require('github-webhook-handler');
const debug = require('debug')('PRobot');
const robot = require('./lib/robot');

const PORT = process.env.PORT || 3000;
const webhook = createHandler({path: '/', secret: process.env.WEBHOOK_SECRET || 'development'});

debug('Starting');

http.createServer((req, res) => {
  webhook(req, res, err => {
    if (err) {
      console.error(err);
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
  console.error(reason);
});

console.log('Listening on http://localhost:' + PORT);
