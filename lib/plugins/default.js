const path = require('path')
const qs = require('qs')

module.exports = async robot => {
  let pkg
  try {
    pkg = require(path.join(process.cwd(), 'package.json'))
  } catch (e) {
    pkg = {}
  }

  class Setup {
    constructor (pkg, env, req) {
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
      return {
        name: pkg.name,
        description: pkg.description,
        url: pkg.homepage || pkg.repository,
        // callback_url,
        // setup_url,
        // public,
        // single_file_name,
        // events,
        webhook_url: this.webhook_url,
        webhook_secret: this.webhook_secret
      }
    }
  }

  const app = robot.route()

  app.get('/probot', (req, res) => {
    const setup = new Setup(pkg, process.env, req)
    res.render('probot.hbs', {pkg, setup})
  })

  app.get('/', (req, res, next) => res.redirect('/probot'))
}
