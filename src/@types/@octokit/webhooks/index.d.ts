declare module '@octokit/webhooks' {
  import {Application} from 'express'

  interface Options {
    path: string,
    secret: string
  }

  declare class Webhooks {
    public middleware: Application

    constructor(Options)

    public on(event: string, callback: (event: WebhookEvent | Error) => void)
  }

  declare namespace Webhooks {
    export interface WebhookEvent {
      name: string
      id: number
      payload: any
      protocol?: 'http' | 'https'
      host?: string
      url?: string
    }
  }

  export = Webhooks
}
