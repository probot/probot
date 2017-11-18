const path = require('path')

module.exports = robot => {
  const app = robot.route()

  app.get('/probot', (req, res) => {
    let pkg
    try {
      pkg = require(path.join(process.cwd(), 'package.json'))
    } catch (e) {
      pkg = {}
    }

    res.render('probot.hbs', pkg)
  })
  app.get('/', (req, res, next) => res.redirect('/probot'))
}
