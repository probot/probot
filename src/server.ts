import Logger from 'bunyan'
import express from 'express'
import path from 'path'

// Teach express to properly handle async errors
// tslint:disable-next-line:no-var-requires
require('express-async-errors')

import { logRequest } from './middleware/logging'

export const createServer = (args: ServerArgs) => {
  const app: express.Application = express()

  app.use(logRequest({ logger: args.logger }))
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
