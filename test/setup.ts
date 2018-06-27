// This file gets loaded when mocha is run

process.env.LOG_LEVEL = 'fatal'

const nock = require('nock')

nock.disableNetConnect()
nock.enableNetConnect(/127\.0\.0\.1/)
