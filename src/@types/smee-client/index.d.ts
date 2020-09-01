declare module "smee-client" {
  import EventSource = require('eventsource')

  type Severity = 'info' | 'error'

  interface Options {
      source?: string
      target: string
      logger?: Pick<Console, Severity>
  }

  class Client {
    constructor ({ source, target, logger}: Options)
    public onmessage (msg: any): void
    public onopen(): void
    public onerror(err: any): void
    public start(): EventSource
    public static createChannel(): Promise<string>
  }

  export = Client
}
