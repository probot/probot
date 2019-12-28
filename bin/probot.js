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

// Valid commands in scope
const helpCmd = ['help', 'help run', 'help receive']

const availableCommands = program.commands.map(cmd => cmd._name)
availableCommands.push(...helpCmd)

program.on('command:*', () => {
  const cmd = program.args.join(' ')
  if (!availableCommands.includes(cmd)) {
  	console.log(`Invalid command ${cmd}\n`)
    program.outputHelp()
    process.exit(1)	
  }
})

program
  .parse(process.argv)
