import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
// Remove me once this is possible via octokit/rest.js
import fetch from 'node-fetch'

import { exec } from 'child_process'
import { Request, Response } from 'express'
import updateDotenv from 'update-dotenv'
import { Application } from '../application'
import { GitHubAPI } from '../github'
import { createApp } from '../github-app'

// TODO: use actual server address:port
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
  // console.log(route)

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    const githubHost = process.env.GHE_HOST || `github.com`

    const createAppUrl = `http://${githubHost}/settings/apps/new?manifest=${baseUrl}/probot/app.json`

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
    const { code } = req.query
    // Todo can we re-use the logic from application.ts here?
    const response = await fetch(`https://app-manifest.review-lab.github.com/api/v3/app-manifests/${code}/conversions`, {
      headers: { 'User-Agent': 'curl/92dfe4c95d28b737ec118c3b4a2c1b269871d3b8' },
      method: 'POST'
    })
    const { id, webhook_secret, pem } = await response.json()

    // Save secrets in .env
    await updateDotenv({
      APP_ID: id.toString(),
      PRIVATE_KEY: pem,
      WEBHOOK_SECRET: webhook_secret
    })
    if (process.env.PROJECT_REMIX_CHAIN) {
      exec('refresh', (err, stdout, stderr) => {
        if (err) {
          app.log.error(err, stderr)
        }
      })
    }

    const jwt = createApp({ id, cert: pem })
    const github = GitHubAPI({
      baseUrl: 'https://app-manifest.review-lab.github.com'
    })
    github.authenticate({ type: 'app', token: jwt() })

    try {
    // TODO: figure out why this 406's
    //  { HttpError
    //   at response.text.then.message (/Users/hiimbex/Desktop/probot/node_modules/@octokit/rest/lib/request/request.js:72:19)
    //   at <anonymous>
    //   at process._tickDomainCallback (internal/process/next_tick.js:228:7)
    // name: 'HttpError',
    // code: 406,
    // status: undefined,
      const response = await github.apps.get({})
      console.log(response.data.info)
      res.redirect(`${response.data.info.html_url}/installations/new`)
    } catch (err) {
      console.log(err)
    }
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
