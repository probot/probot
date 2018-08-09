import path from 'path'
import qs from 'qs'

import { Request, Response } from 'express'
import { Application } from '../application'
import { GitHubAPI } from '../github'
import { createApp } from '../github-app'
import updateDotenv from '../update-dotenv'

class Setup {
  public env: any
  public req: Request

  constructor (env: any, req: Request) {
    this.env = env
    this.req = req
  }

  get baseUrl () {
    const protocol = this.req.headers['x-forwarded-proto'] || this.req.protocol
    const host = this.req.headers['x-forwarded-host'] || this.req.get('host')
    return `${protocol}://${host}`
  }

  get url () {
    const host = process.env.GHE_HOST || `github.com`
    const params = qs.stringify(this.params)
    return `https://${host}/settings/apps/new?${params}`
  }

  get callback_url () {
    return `${this.baseUrl}/probot/setup`
  }

  // GitHub properties use underscores
  /* eslint-disable camelcase */
  get webhook_url () {
    return this.env.WEBHOOK_PROXY_URL || `${this.baseUrl}/`

  }

  get params () {
    return {
      callback_url: this.callback_url,
      managed: true,
      webhook_url: this.webhook_url
    }
  }
}

export = (app: Application) => {
  let pkg: any
  try {
    pkg = require(path.join(process.cwd(), 'package.json'))
  } catch (e) {
    pkg = {}
  }

  const route = app.route()

  route.get('/probot', (req, res) => {
    const setup = new Setup(process.env, req)
    res.render('probot.hbs', { pkg, setup })
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    const { app_id, pem, webhook_secret } = req.query

    // Save secrets in .env
    await updateDotenv({
      APP_ID: app_id,
      PRIVATE_KEY: pem,
      WEBHOOK_SECRET: webhook_secret
    })

    const app = createApp({ id: app_id, cert: pem })
    const github = GitHubAPI()
    github.authenticate({ type: 'app', token: app() })

    const { data: info } = await github.apps.get({})
    res.redirect(`${info.html_url}/installations/new`)
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
