declare module '@octokit/webhooks' {
  import {Application} from 'express'

  interface Options {
    path: string,
    secret: string
  }

  declare class Webhooks {
    public middleware: Application

    constructor(Options)
  }

  export = Webhooks
}
