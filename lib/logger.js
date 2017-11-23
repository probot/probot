const bunyan = require('bunyan')
const bunyanFormat = require('bunyan-format')
const serializers = require('./serializers')

module.exports = bunyan.createLogger({
  name: 'Probot',
  level: process.env.LOG_LEVEL || 'debug',
  stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'}),
  serializers
})
