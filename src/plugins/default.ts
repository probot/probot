import * as path from 'path'
import {Application} from '../application'

export = (app: Application) => {
  const route = app.route()

  route.get('/probot', (req, res) => {
    let pkg
    try {
      pkg = require(path.join(process.cwd(), 'package.json'))
    } catch (e) {
      pkg = {}
    }

    res.render('probot.hbs', pkg)
  })
  route.get('/', (req, res, next) => res.redirect('/probot'))
}
