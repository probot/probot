const express = require('express')
const path = require('path')

module.exports = function (webhook, logger) {
  const app = express()

  app.use((req, res, next) => {
    log(req, logger)
    next()
  })
  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  app.use(webhook)
  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '..', 'views'))
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
