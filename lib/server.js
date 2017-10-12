const express = require('express')
const path = require('path')
const htmlString = require('./probot-welcome')
const pathResolve = require('path').resolve

module.exports = function (webhook) {
  const {routes} = require('../')
  const app = express()
  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  let pkg

  try {
    pkg = require(pathResolve(process.cwd(), 'package.json'))
  } catch (e) {
    pkg = {}
  }

  app.use(webhook)
  app.get('/ping', (req, res) => res.end('PONG'))
  app.get('/probot', (req, res) => res.end(htmlString(pkg)))
  app.get('/', (req, res, next) => {
    if (req.headers['x-hub-signature']) {
      return next()
    }

    const indexRoutes = app._router.stack.filter(layer => layer.route && layer.route.path === '/')
    if (indexRoutes.length === 1 && !routes.has('/')) {
      return res.redirect('/probot')
    } else {
      return next()
    }
  })

  return app
}
