const http = require('http');

const createHandler = function (webhook, handler) {
  return function (req, res) {
    webhook(req, res, err => {
      if (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Something has gone terribly wrong.');
      } else if (req.url.split('?').shift() === '/ping') {
        res.end('PONG');
      } else if (handler) {
        handler(req, res);
      } else {
        res.statusCode = 404;
        res.end('no such location');
      }
    });
  };
};

const createServer = function (webhook, handler = undefined) {
  return http.createServer(createHandler(webhook, handler));
};
createServer.createHandler = createHandler;
module.exports = createServer;
