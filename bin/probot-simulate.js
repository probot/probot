#!/usr/bin/env node
// Usage: bin/simulate issues path/to/payload plugin.js

require('dotenv').config({silent: true});

const process = require('process');
const path = require('path');

const eventName = process.argv[2];
const payloadPath = process.argv[3];
const pluginPath = process.argv[4];

if (!eventName || !payloadPath) {
  console.log('Usage: bin/probot-simulate event-name path/to/payload.json');
  process.exit(1);
}

const payload = require(path.join(process.cwd(), payloadPath));

const createProbot = require('../');
const {findPrivateKey} = require('../lib/private-key');

const probot = createProbot({
  id: process.env.INTEGRATION_ID,
  secret: process.env.WEBHOOK_SECRET,
  cert: findPrivateKey(),
  port: process.env.PORT
});

const plugins = require('../lib/plugin')(probot);

plugins.load([pluginPath]);

probot.robot.log('Simulating event', eventName);
probot.robot.webhook.emit(eventName, {event: eventName, payload});
