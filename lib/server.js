const express = require('express')
const path = require('path')
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

  app.set('view engine', 'ejs')
  app.get('/ping', (req, res) => res.end('PONG'))
  app.get('/probot', (req, res) => res.render(path.join(__dirname, 'pages', 'probot.ejs'), {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description
  }))
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
