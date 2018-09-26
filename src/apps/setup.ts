import { exec } from 'child_process'
import { Request, Response } from 'express'
import { Application } from '../application'
import { ManifestCreation } from '../manifest-creation'

// use glitch env to get correct domain welcome message
// https://glitch.com/help/project/
const domain = process.env.PROJECT_DOMAIN || `http://localhost:${process.env.PORT || 3000}`
const welcomeMessage = `\nWelcome to Probot! Go to ${domain} to get started.\n`

export = async (app: Application, setup: ManifestCreation = new ManifestCreation()) => {
  // If not on Glitch or Production, create a smee URL
  if (process.env.NODE_ENV !== 'production' && !(process.env.PROJECT_DOMAIN || process.env.WEBHOOK_PROXY_URL)) {
    await setup.createWebhookChannel()
  }

  const route = app.route()

  app.log.info(welcomeMessage)

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    const pkg = setup.pkg
    const manifest = setup.getManifest(pkg, baseUrl)
    const createAppUrl = setup.createAppUrl
    // Pass the manifest to be POST'd
    res.render('setup.hbs', { pkg, createAppUrl, manifest })
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    const { code } = req.query
    const response = await setup.createAppFromCode(code)

    // If using glitch, restart the app
    if (process.env.PROJECT_DOMAIN) {
      exec('refresh', (err, stdout, stderr) => {
        if (err) {
          app.log.error(err, stderr)
        }
      })
    }

    res.redirect(`${response}/installations/new`)
  })

  route.get('/probot/success', async (req, res) => {
    res.render('success.hbs')
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
