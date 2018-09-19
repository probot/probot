import { exec } from 'child_process'
import { Request, Response } from 'express'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import updateDotenv from 'update-dotenv'
import { Application } from '../application'
import { GitHubAPI } from '../github'
import { Thingerator } from '../thingerator'

export = async (app: Application, setup: Thingerator = new Thingerator()) => {
  const pkg = setup.pkg

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
    await setup.createWebhookChannel()
  }

  const route = app.route()

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    const githubHost = process.env.GHE_HOST || `github.com`
    // const githubHost = process.env.GHE_HOST || `github.com`
    // const githubHost = 'post-app-manifest-client-side.review-lab.github.com'
    // TODO: once this is live, remove this

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

    const createAppUrl = `http://${githubHost}/settings/apps/new`
    // Pass the manifest to be POST'd
    res.render('setup.hbs', { pkg, createAppUrl, generatedManifest })
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    const { code } = req.query
    // curl -X POST https://api.github.com/app-manifests/cd5a8639598666ca51001451dce9b832ea1692bc/conversions -I \
    // -H "Accept: application/vnd.github.fury-preview+json"
    const github = GitHubAPI()
    const response = await github.request({
      url: `/app-manifests/${code}/conversions`,
      method: 'POST',
      headers: { accept: 'application/vnd.github.fury-preview+json' }
    })

    console.log(response)
    const { id, webhook_secret, pem } = response.data

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

    res.redirect(`${response.data.html_url}/installations/new`)
    // TODO: make sure app is actually running regularly ??
    // dotenv.load() ??
    // exec('npm start')
  })

  route.get('/probot/success', async (req, res) => {
    res.render('success.hbs')
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
