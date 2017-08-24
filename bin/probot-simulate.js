#!/usr/bin/env node
// Usage: bin/simulate issues path/to/payload app.js

require('dotenv').config({silent: true})

const path = require('path')
const program = require('commander')
const {findPrivateKey} = require('../lib/private-key')

program
  .usage('[options] <event-name> <path/to/payload.json> [path/to/app.js...]')
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .parse(process.argv)

const eventName = program.args[0]
const payloadPath = program.args[1]

if (!eventName || !payloadPath) {
  program.help()
}

const payload = require(path.join(process.cwd(), payloadPath))

const createProbot = require('../')

const probot = createProbot({
  id: program.app,
  cert: findPrivateKey()
})

const plugins = require('../lib/plugin')(probot)

plugins.load(program.args.slice(2))

probot.logger.debug('Simulating event', eventName)
probot.receive({event: eventName, payload})
