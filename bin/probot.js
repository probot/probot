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

// Parsing the exact argument
const [, , arg] = process.argv

// Valid commands and options in scope
const availableCommands = program.commands.map(cmd => cmd._name)
const availableOptions = ['-V', '--version', '-h', '--help']

// Helper method to show suitable warning message
const showWarningMessage = (type) => {
  console.log(`Invalid ${type} ${arg}\n`)
  program.help()  	
}

if (arg) {
  if (arg.startsWith('-')) {
    if (!availableOptions.includes(arg)) {
      showWarningMessage('option')
    }
  } else {
    if (!availableCommands.includes(arg)) {
      showWarningMessage('command')	
    } 
  }
}

program
  .parse(process.argv)
