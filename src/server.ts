import * as path from 'path'
import * as express from 'express'
import * as Logger from 'bunyan'
// Teach express to properly handle async errors
require('express-async-errors')

import {logRequest} from './middleware/logging'

export const createServer = function (args: ServerArgs) {
  const app:express.Application = express()

  app.use(logRequest({logger: args.logger}))
  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  app.use(args.webhook)
  app.set('view engine', 'hbs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}

export interface ServerArgs {
  webhook: express.Application
  logger: Logger
}
