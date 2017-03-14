const http = require('http');

module.exports = function (webhook) {
  return http.createServer((req, res) => {
    if (webhook.domain === null) {
      console.error('Error creating webhook handler');
      res.statusCode = 404;
      res.end('Webhook domain is null');
      return;
    }
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
  });
};
