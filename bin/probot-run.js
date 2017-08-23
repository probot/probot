#!/usr/bin/env node

require('dotenv').config();

const pkgConf = require('pkg-conf');
const program = require('commander');

const {findPrivateKey} = require('../lib/private-key');

program
  .usage('[options] <plugins...>')
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-s, --secret <secret>', 'Webhook secret of the GitHub App', process.env.WEBHOOK_SECRET)
  .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .option('-w, --webhook-path <path>', 'URL path which receives webhooks. Ex: `/webhook`', process.env.WEBHOOK_PATH)
  .option('-t, --tunnel <subdomain>', 'Expose your local bot to the internet', process.env.SUBDOMAIN || process.env.NODE_ENV !== 'production')
  .parse(process.argv);

if (!program.app) {
  console.warn('Missing GitHub App ID.\nUse --app flag or set APP_ID environment variable.');
  program.help();
}

if (!program.privateKey) {
  program.privateKey = findPrivateKey();
}

if (program.tunnel) {
  try {
    const setupTunnel = require('../lib/tunnel');
    setupTunnel(program.tunnel, program.port).then(tunnel => {
      console.log('Listening on ' + tunnel.url);
    }).catch(err => {
      console.warn('Could not open tunnel: ', err.message);
    });
  } catch (err) {
    console.warn('Run `npm install --save-dev localtunnel` to enable localtunnel.');
  }
}

const createProbot = require('../');

const probot = createProbot({
  id: program.app,
  secret: program.secret,
  cert: program.privateKey,
  port: program.port,
  webhookPath: program.webhookPath
});

pkgConf('probot').then(pkg => {
  const plugins = require('../lib/plugin')(probot);
  const requestedPlugins = program.args.concat(pkg.plugins || []);

  // If we have explicitly requested plugins, load them; otherwise use autoloading
  if (requestedPlugins.length > 0) {
    plugins.load(requestedPlugins);
  } else {
    plugins.autoload();
  }
  probot.start();
});
