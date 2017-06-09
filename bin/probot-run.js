#!/usr/bin/env node

require('dotenv').config();

const pkgConf = require('pkg-conf');
const program = require('commander');

const {findPrivateKey} = require('../lib/private-key');

program
  .usage('[options] <plugins...>')
  .option('-i, --integration <id>', 'DEPRECATED: ID of the GitHub App', process.env.INTEGRATION_ID)
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-s, --secret <secret>', 'Webhook secret of the GitHub App', process.env.WEBHOOK_SECRET || 'development')
  .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .option('-t, --tunnel <subdomain>', 'Expose your local bot to the internet', process.env.SUBDOMAIN || process.env.NODE_ENV !== 'production')
  .parse(process.argv);

if (program.integration) {
  // FIXME: remove in v0.7.0
  console.warn(
    `DEPRECATION: The --integration flag and APP_ID environment variable are\n` +
    `deprecated. Use the --app flag or set APP_ID environment variable instead.`
  );
  program.app = program.integration;
}

if (!program.app) {
  console.warn('Missing GitHub App ID.\nUse --app flag or set APP_ID environment variable.');
  program.help();
}

if (!program.privateKey) {
  program.privateKey = findPrivateKey();
}

if (program.tunnel) {
  try {
    setupTunnel();
  } catch (err) {
    console.warn('Run `npm install --save-dev localtunnel` to enable localtunnel.');
  }
}

function setupTunnel() {
  // eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
  const localtunnel = require('localtunnel');
  const subdomain = typeof program.tunnel === 'string' ?
    program.tunnel :
    require('os').userInfo().username;

  const tunnel = localtunnel(program.port, {subdomain}, (err, tunnel) => {
    if (err) {
      console.warn('Could not open tunnel: ', err.message);
    } else {
      console.log('Listening on ' + tunnel.url);
    }
  });

  tunnel.on('close', () => {
    console.warn('Local tunnel closed');
  });
}

const createProbot = require('../');

const probot = createProbot({
  id: program.app,
  secret: program.secret,
  cert: program.privateKey,
  port: program.port
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
