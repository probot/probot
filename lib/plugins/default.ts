import * as path from 'path'
import * as express from 'express'

export = (robot: any): void => {
  const app = robot.route()

  app.get('/probot', (req: express.Request, res: express.Response) => {
    let pkg
    try {
      pkg = require(path.join(process.cwd(), 'package.json'))
    } catch (e) {
      pkg = {}
    }

    res.render('probot.hbs', pkg)
  })
  app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => res.redirect('/probot'))
}
