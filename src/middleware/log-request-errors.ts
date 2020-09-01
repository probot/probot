import { ErrorRequestHandler, NextFunction } from 'express'
import { Request, Response } from './logging'

export const logRequestErrors: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (req.log) {
    req.log.error(err)
  }
  next()
}
