#!/usr/bin/env node

const semver = require('semver')
const program = require('commander')
const version = require('../package').engines.node

if (!semver.satisfies(process.version, version)) {
  console.log(`Node.js version ${version} is required. You have ${process.version}.`)
  process.exit(1)
}

program
  .version(require('../package').version)
  .usage('<command> [options]')
  .command('run', 'run the bot')
  .command('receive', 'Receive a single event and payload')

program.on('command:*', (cmd) => {
  console.log(`\nInvalid command ${cmd}\n`)
  program.outputHelp()  
})

program
  .parse(process.argv)
