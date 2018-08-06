import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import qs from 'qs'

import { Request } from 'express'
import { Application } from '../application'

class Setup {
  public config: any
  public pkg: any
  public env: any
  public req: Request

  constructor (config: any, pkg: any, env: any, req: Request) {
    this.config = config
    this.pkg = pkg
    this.env = env
    this.req = req
  }

  get url () {
    const host = process.env.GHE_HOST || `github.com`
    const params = qs.stringify(this.params)
    return `https://${host}/settings/apps/new?${params}`
  }

  // GitHub properties use underscores
  /* eslint-disable camelcase */
  get webhook_url () {
    return this.env.WEBHOOK_PROXY_URL
  }

  get webhook_secret () {
    return this.env.WEBHOOK_SECRET || 'development'
  }

  get params () {
    return Object.assign({
      description: this.pkg.description,
      name: this.pkg.name,
      url: this.pkg.homepage || this.pkg.repository,
      // callback_url,
      // setup_url,
      // public,
      // single_file_name,
      // events,
      webhook_secret: this.webhook_secret,
      webhook_url: this.webhook_url
    }, this.config)
  }
}

export = (app: Application) => {
  let pkg: any
  try {
    pkg = require(path.join(process.cwd(), 'package.json'))
  } catch (e) {
    pkg = {}
  }

  let config: any
  try {
    const file = fs.readFileSync(path.join(process.cwd(), 'app.yml'), 'utf8')
    config = yaml.safeLoad(file)
  } catch (err) {
    // App config does not exist, which is ok.
    if (err.code !== 'ENOENT') {
      throw err
    }
  }

  const route = app.route()

  route.get('/probot', (req, res) => {
    const setup = new Setup(config, pkg, process.env, req)
    res.render('probot.hbs', { pkg, setup })
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
