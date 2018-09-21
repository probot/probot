// import { exec } from 'child_process'
import { Request, Response } from 'express'
import { Application } from '../application'
import { Thingerator } from '../thingerator'

export = async (app: Application, setup: Thingerator = new Thingerator()) => {
  if (process.env.NODE_ENV !== 'production') {
    await setup.createWebhookChannel()
  }

  const route = app.route()

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
    const url = await setup.createAppFromCode(code)

    // if (process.env.PROJECT_REMIX_CHAIN) {
    //   exec('refresh', (err, stdout, stderr) => {
    //     if (err) {
    //       app.log.error(err, stderr)
    //     }
    //   })
    // }
    res.redirect(`${url}/installations/new`)
  })

  route.get('/probot/success', async (req, res) => {
    res.render('success.hbs')
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
