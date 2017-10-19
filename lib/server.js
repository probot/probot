const express = require('express')

module.exports = function (webhook, logger) {
  const app = express()

  app.use((req, res, next) => {
    log(req, logger)
    next()
  })
  app.use(webhook)
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}

function log (req, logger) {
  if (process.env.LOG_LEVEL === 'trace') {
    logger.trace({ method: req.method, path: req.path, ip: req.ip, hostname: req.hostname, originalUrl: req.originalUrl, protocol: req.protocol, params: req.params, body: req.body, cookies: req.cookies }, 'request')
  } else {
    logger.info({method: req.method, path: req.path, ip: req.ip}, 'request')
  }
}
