const pathResolve = require('path').resolve

const express = require('express')

module.exports = function (webhook) {
  const app = express()
  let pkg

  try {
    pkg = require(pathResolve(process.cwd(), 'package.json'))
  } catch (error) {
    pkg = {}
  }

  app.use((req, res, next) => {
    if (req.url !== '/' || req.method !== 'GET') {
      return next()
    }

    if (req.headers['x-hub-signature']) {
      return next()
    }

    const html = `
<h1>${pkg.name} (v${pkg.version})</h1>
<p>${pkg.description}</p>
`

    res.send(html)
  })
  app.use(webhook)
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}
