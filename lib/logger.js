/**
 * A logger backed by [bunyan](https://github.com/trentm/node-bunyan)
 *
 * The default log level is `info`, but you can change it by setting the
 * `LOG_LEVEL` environment variable to `trace`, `debug`, `info`, `warn`,
 * `error`, or `fatal`.
 *
 * By default, logs are formatted for readability in development. If you intend
 * to drain logs to a logging service, set `LOG_FORMAT=json`.
 *
 * **Note**: All execptions reported with `logger.error` will be forwarded to
 * [sentry](https://github.com/getsentry/sentry) if the `SENTRY_DSN` environment
 * variable is set.
 *
 * @typedef logger
 *
 * @example
 *
 * robot.log("This is an info message");
 * robot.log.debug("…so is this");
 * robot.log.trace("Now we're talking");
 * robot.log.info("I thought you should know…");
 * robot.log.warn("Woah there");
 * robot.log.error("ETOOMANYLOGS");
 * robot.log.fatal("Goodbye, cruel world!");
 */

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
