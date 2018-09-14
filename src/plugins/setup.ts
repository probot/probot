import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

import { exec } from 'child_process'
import { Request, Response } from 'express'
import updateDotenv from 'update-dotenv'
import { Application } from '../application'
import { GitHubAPI } from '../github'
import { createApp } from '../github-app'

// TODO: use actual server address:port
// I think this is fine since index.ts does the same thing
const welcomeMessage = `
Welcome to Probot! Go to http://localhost:${process.env.PORT || 3000} to get started.
`

export = async (app: Application) => {
  app.log.info(welcomeMessage)

  let pkg: any
  try {
    pkg = require(path.join(process.cwd(), 'package.json'))
  } catch (e) {
    pkg = {}
  }

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

  if (process.env.NODE_ENV !== 'production') {
    try {
      // tslint:disable:no-var-requires
      const SmeeClient = require('smee-client')
      await updateDotenv({ WEBHOOK_PROXY_URL: await SmeeClient.createChannel() })
    } catch (err) {
      // Smee is not available, so we'll just move on
      console.warn('Unable to connect to smee.io, try restarting your server.')
    }
  }

  const route = app.route()

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    const githubHost = process.env.GHE_HOST || `github.com`

    const createAppUrl = `https://${githubHost}/settings/apps/new?manifest=${baseUrl}/probot/app.json`

    res.render('setup.hbs', { pkg, createAppUrl })
  })

  route.get('/probot/app.json', (req: Request, res: Response) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    res.json(Object.assign({
      callback_url: `${baseUrl}/probot/setup`,
      description: manifest.description || pkg.description,
      // add setup url
      hook_attributes: {
        url: process.env.WEBHOOK_PROXY_URL || `${baseUrl}/`
      },
      name: manifest.name || pkg.name,
      url: manifest.url || pkg.homepage || pkg.repository
    }, manifest))
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    // make api request
    // https://github.com/probot/probot/compare/setup-callback...manifest-with-code
    const { app_id, pem, webhook_secret } = req.query

    // Save secrets in .env
    await updateDotenv({
      APP_ID: app_id,
      PRIVATE_KEY: `"${pem}"`,
      WEBHOOK_SECRET: webhook_secret
    })
    if (process.env.PROJECT_REMIX_CHAIN) {
      exec('refresh', (err, stdout, stderr) => {
        if (err) {
          app.log.error(err, stderr)
        }
      })
    }

    const jwt = createApp({ id: app_id, cert: pem })
    const github = GitHubAPI()
    github.authenticate({ type: 'app', token: jwt() })

    const { data: info } = await github.apps.get({})
    res.redirect(`${info.html_url}/installations/new`)
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
