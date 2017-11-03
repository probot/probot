const express = require('express')
const path = require('path')
const morgan = require('morgan')

module.exports = function (webhook) {
  const app = express()

  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  app.use(webhook)
  app.use(morgan('short'))
  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}
