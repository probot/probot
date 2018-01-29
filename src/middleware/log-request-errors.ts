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
module.exports = (err, req: Logger.Request, res: Logger.Response, next: Express.NextFunction) => {
  req.log.error(err)
  next()
}
