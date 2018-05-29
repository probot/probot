import {NextFunction} from 'express'
import {Request,Response} from './logging'

module.exports = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (req.log) {
    req.log.error(err)
  }
  next()
}
