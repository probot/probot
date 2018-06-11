declare module '@octokit/webhooks' {
  import {Application} from 'express'

  declare class Webhooks {
    public middleware: Application

    constructor()
  }

  export = Webhooks
}
