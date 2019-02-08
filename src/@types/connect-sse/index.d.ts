declare module "connect-sse" {
    import { Request, Response, NextFunction } from 'express'

    function sse(req: Request, resp: Response, next: NextFunction): void
    export = () => sse
}
