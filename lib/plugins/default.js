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

  app.get('/probot', (req, res) => res.render('probot', pkg))
  app.get('/', (req, res, next) => res.redirect('/probot'))
}
