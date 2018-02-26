#!/usr/bin/env node

require('dotenv').config()

const pkgConf = require('pkg-conf')
const program = require('commander')

const {findPrivateKey} = require('../lib/private-key')

program
  .usage('[options] <apps...>')
  .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
  .option('-t, --tunnel <subdomain>', 'Deprecated: localtunnel support has been removed', process.env.SUBDOMAIN)
  .option('-W, --webhook-proxy <url>', 'URL of the webhook proxy service.`', process.env.WEBHOOK_PROXY_URL)
  .option('-w, --webhook-path <path>', 'URL path which receives webhooks. Ex: `/webhook`', process.env.WEBHOOK_PATH)
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-s, --secret <secret>', 'Webhook secret of the GitHub App', process.env.WEBHOOK_SECRET)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .parse(process.argv)

if (!program.app) {
  console.warn('Missing GitHub App ID.\nUse --app flag or set APP_ID environment variable.')
  program.help()
}

if (!program.privateKey) {
  program.privateKey = findPrivateKey()
}

const {createProbot} = require('../')

const probot = createProbot({
  id: program.app,
  secret: program.secret,
  cert: program.privateKey,
  port: program.port,
  webhookPath: program.webhookPath,
  webhookProxy: program.webhookProxy
})

if (!program.webhookProxy && program.tunnel) {
  // TOOD: Remove for the 6.0.0 release
  console.warn('[DEPRECATED] localtunnel support has been removed. See https://github.com/probot/probot/issues/391')
}

pkgConf('probot').then(pkg => {
  probot.setup(program.args.concat(pkg.apps || pkg.plugins || []))
  probot.start()
})
