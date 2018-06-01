// Borrowed from https://github.com/vvo/bunyan-request
// Copyright (c) Christian Tellnes <christian@tellnes.no>
// tslint:disable
import {wrapLogger} from '../wrap-logger'
import * as uuid from 'uuid'
import * as express from 'express'
import * as Logger from 'bunyan'

export const logRequest = function ({logger}: any): express.RequestHandler {
  return function (req: Request, res: Response, next: NextFunction) {
    // Use X-Request-ID from request if it is set, otherwise generate a uuid
    req.id = req.headers['x-request-id'] ||
      req.headers['x-github-delivery'] ||
      uuid.v4()
    res.setHeader('x-request-id', req.id)

    // Make a logger available on the request
    req.log = wrapLogger(logger, logger.target).child({name: 'http', id: req.id})

    // Request started
    req.log.trace({req}, `${req.method} ${req.url}`)

    // Start the request timer
    const time = process.hrtime()

    res.on('finish', () => {
      // Calculate how long the request took
      const [seconds, nanoseconds] = process.hrtime(time)
      res.duration = (seconds * 1e3 + nanoseconds * 1e-6).toFixed(2)

      const message = `${req.method} ${req.url} ${res.statusCode} - ${res.duration} ms`

      if (req.log) {
        req.log.info(message)
        req.log.trace({res})
      }
    })

    next()
  }
}

export interface Request extends express.Request {
  id?: string | number | string[]
  log?: Logger
}

export interface Response extends express.Response {
  duration?: string
  log?: Logger
}

export interface NextFunction extends express.NextFunction { }
