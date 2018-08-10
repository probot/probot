import path from 'path'
import qs from 'qs'

import { Request, Response } from 'express'
import { Application } from '../application'
import { GitHubAPI } from '../github'
import { createApp } from '../github-app'
import updateDotenv from '../update-dotenv'

// TODO: use actual server address:port
const welcomeMessage = `
Welcome to Probot! Go to https://localhost:3000 to get started.
`

export = (app: Application) => {
  app.log.info(welcomeMessage)

  let pkg: any
  try {
    pkg = require(path.join(process.cwd(), 'package.json'))
  } catch (e) {
    pkg = {}
  }

  const route = app.route()

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    const githubHost = process.env.GHE_HOST || `github.com`

    const params = qs.stringify({
      callback_url: `${baseUrl}/probot/setup`,
      managed: true,
      webhook_url: `${baseUrl}/`
    })

    const createAppUrl = `https://${githubHost}/settings/apps/new?${params}`

    res.render('setup.hbs', { pkg, createAppUrl })
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    const { app_id, pem, webhook_secret } = req.query

    // Save secrets in .env
    await updateDotenv({
      APP_ID: app_id,
      PRIVATE_KEY: `"${pem}"`,
      WEBHOOK_SECRET: webhook_secret
    })

    const jwt = createApp({ id: app_id, cert: pem })
    const github = GitHubAPI()
    github.authenticate({ type: 'app', token: jwt() })

    const { data: info } = await github.apps.get({})
    res.redirect(`${info.html_url}/installations/new`)
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
