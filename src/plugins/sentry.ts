import * as sentryStream from 'bunyan-sentry-stream'
import * as Raven from 'raven'

export = (robot: any): void => {
  const SENTRY_DSN = process.env.SENTRY_DSN
  // If sentry is configured, report all logged errors
  if (SENTRY_DSN) {
    robot.log.debug(SENTRY_DSN, 'Errors will be reported to Sentry')
    Raven.disableConsoleAlerts()
    Raven.config(SENTRY_DSN, {
      autoBreadcrumbs: true
    }).install({})

    robot.log.target.addStream(sentryStream(Raven))
  }
}
