#!/usr/bin/env node

require('dotenv').config()

const pkgConf = require('pkg-conf')
const program = require('commander')

program
  .usage('[options] <apps...>')
  .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
  .option('-t, --tunnel <subdomain>', 'Expose your local bot to the internet', process.env.SUBDOMAIN || process.env.NODE_ENV !== 'production')
  .option('-w, --webhook-path <path>', 'URL path which receives webhooks. Ex: `/webhook`', process.env.WEBHOOK_PATH)
  .option('-o, --oauthtoken <token>', 'OAuth token for your application', process.env.TOKEN)
  .option('-c, --clientid <id>', 'OAuth token id for your application', process.env.CLIENT_ID)
  .option('-s, --secret <secret>', 'Webhook secret', process.env.WEBHOOK_SECRET)
  .option('-s, --clientsecret <secret>', 'OAuth token secert for your application', process.env.CLIENT_SECRET)
  .parse(process.argv)

process.env.AUTH_METHOD = 'oauth'

if (!program.oauthtoken) {
  console.warn('Missing GitHub OAuth Token.\nUse --oauthtoken flag or set TOKEN environment variable.')
  program.help()
}

const createProbot = require('../')

const probot = createProbot({
  port: program.port,
  webhookPath: program.webhookPath,
  secret: program.secret,
  clientid: program.clientid,
  clientsecret: program.clientsecret
})

if (program.tunnel && !process.env.DISABLE_TUNNEL) {
  try {
    const setupTunnel = require('../lib/tunnel')
    setupTunnel(program.tunnel, program.port)
  } catch (err) {
    probot.logger.debug('Run `npm install --save-dev localtunnel` to enable localtunnel.')
  }
}

pkgConf('probot').then(pkg => {
  probot.setup(program.args.concat(pkg.apps || pkg.plugins || []))
  probot.start()
})
