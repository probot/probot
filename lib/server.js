const express = require('express')
const htmlString = require('./probot-welcome')()

module.exports = function (webhook) {
  const app = express()

  app.use(webhook)
  app.get('/ping', (req, res) => res.end('PONG'))
  app.get('/probot', (req, res) => res.end(htmlString))
  app.get('/', (req, res, next) => {
    const indexRoutes = app._router.stack.filter(layer => layer.route && layer.route.path === '/')
    if (indexRoutes.length <= 1) {
      res.redirect('/probot')
    } else {
      next()
    }
  })

  return app
}
