import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import updateDotenv from 'update-dotenv'
import { GitHubAPI } from './github'

export class ManifestCreation {
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
      description: manifest.description || pkg.description,
      hook_attributes: {
        url: process.env.WEBHOOK_PROXY_URL || `${baseUrl}/`
      },
      name: process.env.PROJECT_DOMAIN || manifest.name || pkg.name,
      public: manifest.public || true,
      redirect_url: `${baseUrl}/probot/setup`,
      // TODO: add setup url
      // setup_url:`${baseUrl}/probot/success`,
      url: manifest.url || pkg.homepage || pkg.repository,
      version: 'v1'
    }, manifest))

    return generatedManifest
  }

  public async createAppFromCode (code: any) {
    const github = GitHubAPI()
    const response = await github.request('POST /app-manifests/:code/conversions', {
      code,
      headers: { accept: 'application/vnd.github.fury-preview+json' }
    })

    const { id, webhook_secret, pem } = response.data
    await this.updateEnv({
      APP_ID: id.toString(),
      PRIVATE_KEY: `"${pem}"`,
      WEBHOOK_SECRET: webhook_secret
    })

    return response.data.html_url
  }

  public async updateEnv (env: any) { // Needs to be public due to tests
    return updateDotenv(env)
  }

  get createAppUrl () {
    const githubHost = process.env.GHE_HOST || `github.com`
    return `https://${githubHost}/settings/apps/new`
  }
}
