import * as path from 'path'
import {Robot} from '../robot'

export = (robot: Robot) => {
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
