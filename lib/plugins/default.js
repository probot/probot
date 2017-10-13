const path = require('path')

let pkg

try {
  pkg = require(path.join(process.cwd(), 'package.json'))
} catch (e) {
  pkg = {}
}

module.exports = robot => {
  const app = robot.route()

  app.get('/probot', (req, res) => res.render('probot.ejs', pkg))
  app.get('/', (req, res, next) => res.redirect('/probot'))
}
