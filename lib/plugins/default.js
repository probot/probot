const path = require('path')
const pathResolve = require('path').resolve

let pkg

try {
  pkg = require(pathResolve(process.cwd(), 'package.json'))
} catch (e) {
  pkg = {}
}

module.exports = robot => {
  const app = robot.route()

  app.get('/probot', (req, res) => res.render(path.join(__dirname, '..', 'pages', 'probot.ejs'), {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description
  }))

  app.get('/', (req, res, next) => res.redirect('/probot'))
}
