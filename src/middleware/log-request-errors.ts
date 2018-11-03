import { ErrorRequestHandler } from 'express'

import { NextFunction, Request, Response } from './logging'

export const requestErrorLogger: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (req.log) {
    req.log.error(err)
  }
  next()
}
