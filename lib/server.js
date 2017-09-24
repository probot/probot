const express = require('express')

module.exports = function () {
  const app = express()

  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}
