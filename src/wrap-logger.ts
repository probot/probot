import { Logger } from './'

// Return a function that defaults to "info" level, and has properties for
// other levels:
//
//     app.log("info")
//     app.log.trace("verbose details");
//
export const wrapLogger = (logger: Logger, baseLogger?: Logger): LoggerWithTarget => {
  const fn = Object.assign(logger.info.bind(logger), {
    // Add level methods on the logger
    debug: logger.debug.bind(logger),
    error: logger.error.bind(logger),
    fatal: logger.fatal.bind(logger),
    info: logger.info.bind(logger),
    trace: logger.trace.bind(logger),
    warn: logger.warn.bind(logger),

    // Expose `child` method for creating new wrapped loggers
    child: (attrs: ChildArgs) => {
      // Bunyan doesn't allow you to overwrite name…
      const name = attrs.name
      delete attrs.name
      const log = logger.child(attrs, true)

      // …Sorry, bunyan, doing it anyway
      if (name) {
        log.fields.name = name
      }

      return wrapLogger(log, baseLogger || logger)
    },
    // Expose target logger
    target: baseLogger || logger
  }) as LoggerWithTarget

  return fn
}

export interface LoggerWithTarget extends Logger {
  (): boolean
  (...params: any[]): void
  target: Logger
  child: (attrs: ChildArgs) => LoggerWithTarget
  trace: LoggerWithTarget
  debug: LoggerWithTarget
  info: LoggerWithTarget
  warn: LoggerWithTarget
  error: LoggerWithTarget
  fatal: LoggerWithTarget
}

export interface ChildArgs {
  options?: object
  name?: string
  id?: string | number | string[]
  installation?: string
  [key: string]: any
}
