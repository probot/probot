import sentryStream from 'bunyan-sentry-stream'
import Raven from 'raven'
import { Application } from '../application'

export = (app: Application) => {
  // If sentry is configured, report all logged errors
  if (process.env.SENTRY_DSN) {
    app.log.debug(process.env.SENTRY_DSN, 'Errors will be reported to Sentry')
    Raven.disableConsoleAlerts()
    Raven.config(process.env.SENTRY_DSN, {
      autoBreadcrumbs: true
    }).install()

    app.log.target.addStream(sentryStream(Raven))
  }
}
