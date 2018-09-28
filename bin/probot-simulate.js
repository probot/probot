#!/usr/bin/env node
// Usage: bin/simulate issues path/to/payload app.js

require('dotenv').config({silent: true})

const path = require('path')
const uuid = require('uuid')
const program = require('commander')
const {findPrivateKey} = require('../lib/private-key')

program
  .usage('[options] [event-name] [path/to/payload.json] [path/to/app.js...]')
  .option('-e, --event <event-name>', 'Event name', process.env.GITHUB_EVENT)
  .option('-p, --event-path <event-path>', 'Event path', process.env.GITHUB_EVENT_PATH)
  .option('-t, --token <access-token>', 'Access token', process.env.GITHUB_TOKEN)
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .parse(process.argv)

const eventName = program.args[0] || program.event
const payloadPath = program.args[1] || program.eventPath
const githubToken = program.token

if (!eventName || !payloadPath || !githubToken) {
  program.help()
}

if (githubToken) {
  process.env.DISABLE_STATS = 'true'
}

const payload = require(path.join(process.cwd(), payloadPath))

const {createProbot} = require('../')

const probot = createProbot({
  id: program.app,
  cert: findPrivateKey(),
  githubToken: githubToken
})

probot.setup(program.args.slice(2))

probot.logger.debug('Simulating event', eventName)
probot.receive({name: eventName, payload, id: uuid.v4() })
  .catch(err => {
    // Process must exist non-zero to indicate that the action failed to run
    // TODO: this is not working yet
    process.exit(1)
  })
