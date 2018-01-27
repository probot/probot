// Borrowed from https://github.com/vvo/bunyan-request
// Copyright (c) Christian Tellnes <christian@tellnes.no>
import * as uuid from 'uuid'

import * as Express from 'express'
import * as Bunyan from 'bunyan'

namespace Logger {
  export interface Request extends Express.Request {
    id: string,
    log: Bunyan
  }
  export interface Response extends Express.Response {
    duration: string
  }
}

module.exports = function logRequest ({logger}) {
  return function (req: Logger.Request, res: Logger.Response, next: Express.NextFunction) {
    // Use X-Request-ID from request if it is set, otherwise generate a uuid
    req.id = req.headers['x-request-id'] ||
      req.headers['x-github-delivery'] ||
      uuid.v4()
    res.setHeader('x-request-id', req.id)

    // Make a logger available on the request
    req.log = logger.wrap().child({id: req.id})

    // Request started
    req.log.trace({req}, `${req.method} ${req.url}`)

    // Start the request timer
    const time = process.hrtime()

    res.on('finish', () => {
      // Calculate how long the request took
      const [seconds, nanoseconds] = process.hrtime(time)
      res.duration = (seconds * 1e3 + nanoseconds * 1e-6).toFixed(2)

      const message = `${req.method} ${req.url} ${res.statusCode} - ${res.duration} ms`

      req.log.info(message)
      req.log.trace({res})
    })

    next()
  }
}
