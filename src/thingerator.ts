import path from 'path'
import updateDotenv from 'update-dotenv'
import fs from 'fs'
import yaml from 'js-yaml'
import { GitHubAPI } from './github'

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
    console.log('creating webhook channel')
    try {
      // tslint:disable:no-var-requires
      const SmeeClient = require('smee-client')
      await this.updateEnv({ WEBHOOK_PROXY_URL: await SmeeClient.createChannel() })
    } catch (err) {
      // Smee is not available, so we'll just move on
      // tslint:disable:no-console
      console.warn('Unable to connect to smee.io, try restarting your server.')
    }
  }

  public getManifest (pkg: any, baseUrl: any) {
    let manifest: any = {}
    try {
      const file = fs.readFileSync(path.join(process.cwd(), 'app.yml'), 'utf8')
      manifest = yaml.safeLoad(file)
    } catch (err) {
      // App config does not exist, which is ok.
      if (err.code !== 'ENOENT') {
        throw err
      }
    }

    const generatedManifest = JSON.stringify(Object.assign({
      redirect_url: `${baseUrl}/probot/setup`,
      description: manifest.description || pkg.description,
      // add setup url
      // setup_url:`${baseUrl}/probot/success`,
      hook_attributes: {
        url: process.env.WEBHOOK_PROXY_URL || `${baseUrl}/`
      },
      name: manifest.name || pkg.name,
      url: manifest.url || pkg.homepage || pkg.repository,
      public: manifest.public || 'true'
    }, manifest))

    return generatedManifest
  }

  public async createAppFromCode (code: any) {
    const github = GitHubAPI()
    const response = await github.request({
      url: `/app-manifests/${code}/conversions`,
      method: 'POST',
      headers: { accept: 'application/vnd.github.fury-preview+json' }
    })

    const { id, webhook_secret, pem } = response.data
    await this.updateEnv({
      APP_ID: id.toString(),
      PRIVATE_KEY: pem,
      WEBHOOK_SECRET: webhook_secret
    })

    return response
  }

  private async updateEnv (env: any) {
    return updateDotenv(env)
  }

  get createAppUrl () {
    const githubHost = process.env.GHE_HOST || `github.com`
    return `http://${githubHost}/settings/apps/new`
  }
}
