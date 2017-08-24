const express = require('express')

module.exports = function (webhook) {
  const app = express()

  app.use(webhook)
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}
