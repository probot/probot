const express = require('express')
const htmlString = require('./probot-welcome')()

module.exports = function (webhook) {
  const app = express()

  app.use(webhook)
  app.get('/ping', (req, res) => res.end('PONG'))
  app.get('/probot', (req, res) => res.end(htmlString))

  return app
}
