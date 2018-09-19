import path from 'path'
import updateDotenv from 'update-dotenv'

export class Thingerator {
  get pkg () {
    let pkg: any
    try {
      pkg = require(path.join(process.cwd(), 'package.json'))
    } catch (e) {
      pkg = {}
    }
    return pkg
  }

  public async createWebhookChannel () {
    console.log('creating webhok channel')
    try {
      // tslint:disable:no-var-requires
      const SmeeClient = require('smee-client')
      await this.updateDotenv({ WEBHOOK_PROXY_URL: await SmeeClient.createChannel() })
    } catch (err) {
      // Smee is not available, so we'll just move on
      // tslint:disable:no-console
      console.warn('Unable to connect to smee.io, try restarting your server.')
    }
  }

  async private updateDotenv (env: any) {
    return updateDotenv(env)
  }
}
