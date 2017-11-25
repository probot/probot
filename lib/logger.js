const Logger = require('bunyan')
const bunyanFormat = require('bunyan-format')
const serializers = require('./serializers')

// Return a function that defaults to "info" level, and has properties for
// other levels:
//
//     robot.log("info")
//     robot.log.trace("verbose details");
//
Logger.prototype.wrap = function () {
  const fn = this.info.bind(this);

  // Add level methods on the logger
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
    fn[level] = this[level].bind(this)
  })

  // Expose `child` method for creating new wrapped loggers
  fn.child = (attrs) => this.child(attrs, true).wrap()

  // Expose target logger
  fn.target = logger

  return fn
}

const logger = new Logger({
  name: 'probot',
  level: process.env.LOG_LEVEL || 'info',
  stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'}),
  serializers
})

module.exports = logger
