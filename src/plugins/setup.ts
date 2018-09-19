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
  const githubHost = process.env.GHE_HOST || `github.com`

  const route = app.route()

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    //const githubHost = process.env.GHE_HOST || `github.com`
    //const githubHost = 'post-app-manifest-client-side.review-lab.github.com'
    // TODO: once this is live, remove this

    let generatedManifest = JSON.stringify(Object.assign({
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

    const createAppUrl = `http://${githubHost}/settings/apps/new`
    // Pass the manifest to be POST'd
    res.render('setup.hbs', { pkg, createAppUrl, generatedManifest })
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    const { code } = req.query
    //curl -X POST https://api.github.com/app-manifests/702790e7ab49bdd0e47cb7cdc64854a79cf5c529/conversions -I \
    // -H "Accept: application/vnd.github.fury-preview+json"

    const response = await fetch(`http://${githubHost}/app-manifests/${code}/conversions`, {
      method: 'POST',
      headers: { 'Accept': 'application/vnd.github.fury-preview+json', 'Content-Type': 'application/json' }
    })

    console.log(response)
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
    const github = GitHubAPI({})
    github.authenticate({ type: 'app', token: jwt() })

    const response = await github.apps.get({})
    res.redirect(`${response.data.html_url}/installations/new`)
  //  exec('npm start')
  })

  route.get('/probot/success', async (req, res) => {
    res.render('success.hbs')
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
