declare module '@octokit/webhooks' {
  import { Application } from 'express'

  interface Options {
    path: string,
    secret: string
  }

  declare class Webhooks {
    public middleware: Application

    constructor (Options)

    public on (event: string, callback: (event: WebhookEvent | Error) => void)
  }

  declare namespace Webhooks {
    export interface WebhookEvent {
      id: string
      name: string
      payload: WebhookPayloadWithRepository
      protocol?: 'http' | 'https'
      host?: string
      url?: string
    }

    export interface PayloadRepository {
      [key: string]: any
      full_name?: string
      name: string
      owner: {
        [key: string]: any
        login: string
        name?: string
      }
      html_url?: string
    }

    export interface WebhookPayloadWithRepository {
      [key: string]: any
      repository?: PayloadRepository
      issue?: {
        [key: string]: any
        number: number
        html_url?: string
        body?: string
      }
      pull_request?: {
        [key: string]: any
        number: number
        html_url?: string
        body?: string
      }
      sender?: {
        [key: string]: any
        type: string
      }
      action?: string
      installation?: {
        id: number
        [key: string]: any
      }
    }
  }

  export = Webhooks
}
