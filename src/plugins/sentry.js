const sentryStream = require('bunyan-sentry-stream')
const Raven = require('raven')

module.exports = robot => {
  // If sentry is configured, report all logged errors
  if (process.env.SENTRY_DSN) {
    robot.log.debug(process.env.SENTRY_DSN, 'Errors will be reported to Sentry')
    Raven.disableConsoleAlerts()
    Raven.config(process.env.SENTRY_DSN, {
      autoBreadcrumbs: true
    }).install({})

    robot.log.target.addStream(sentryStream(Raven))
  }
}
