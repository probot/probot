import * as path from 'path'
import * as express from 'express'
import * as Logger from 'bunyan'

// Teach express to properly handle async errors
require('express-async-errors')

const logging = require('./middleware/logging')

export default function (args: ServerArgs) {
  const app = express()

  app.use(logging({logger: args.logger}))
  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  app.use(args.webhook)
  app.set('view engine', 'hbs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}

interface ServerArgs {webhook: express.Application, logger: Logger}
