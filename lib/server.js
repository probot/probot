const express = require('express')
const path = require('path')
const logging = require('./middleware/logging')

module.exports = function ({webhook, logger}) {
  const app = express()

  app.use(logging({logger}))
  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  app.use(webhook)
  app.set('view engine', 'hbs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}
