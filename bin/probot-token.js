#!/usr/bin/env node

require('dotenv').config()

const program = require('commander')

const {findPrivateKey} = require('../lib/private-key')
const createApp = require('../lib/github-app')

program
  .usage('[options] <apps...>')
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .parse(process.argv)

if (!program.app) {
  console.warn('Missing GitHub App ID.\nUse --app flag or set APP_ID environment variable.')
  program.help()
}

if (!program.privateKey) {
  program.privateKey = findPrivateKey()
}

const app = createApp({
  id: program.app,
  cert: program.privateKey
})

const jwt = app()
console.log(jwt)
