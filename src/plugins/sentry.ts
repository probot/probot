import * as Raven from 'raven'
import {Robot} from '../robot'
const sentryStream = require('bunyan-sentry-stream')

export = (robot: Robot) => {
  // If sentry is configured, report all logged errors
  if (process.env.SENTRY_DSN) {
    robot.log.debug(process.env.SENTRY_DSN, 'Errors will be reported to Sentry')
    Raven.disableConsoleAlerts()
    Raven.config(process.env.SENTRY_DSN, {
      autoBreadcrumbs: true
    }).install()

    robot.log.target.addStream(sentryStream(Raven))
  }
}
