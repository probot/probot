/**
 * A logger backed by [pino](https://getpino.io/)
 *
 * The default log level is `info`, but you can change it passing a level
 * string set to one of: `"trace"`, `"debug"`, `"info"`, `"warn"`,
 * `"error"`, or `"fatal"`.
 *
 * ```js
 * app.log.debug("…so is this");
 * app.log.trace("Now we're talking");
 * app.log.info("I thought you should know…");
 * app.log.warn("Woah there");
 * app.log.error("ETOOMANYLOGS");
 * app.log.fatal("Goodbye, cruel world!");
 * ```
 */
import pino, { LoggerOptions } from "pino";
import { getTransformStream, Options, LogLevel } from "@probot/pino";

type GetLogOptions = { level?: LogLevel } & Options;

export function getLog(options: GetLogOptions = { level: "info" }) {
  const deprecated = [];
  if (process.env.LOG_FORMAT && !options.logFormat) {
    deprecated.push('"LOG_FORMAT"');
    options.logFormat = process.env.LOG_FORMAT as Options["logFormat"];
  }
  if (process.env.LOG_LEVEL_IN_STRING && !options.logLevelInString) {
    deprecated.push('"LOG_LEVEL_IN_STRING"');
    options.logLevelInString = process.env.LOG_LEVEL_IN_STRING === "true";
  }
  if (process.env.SENTRY_DSN && !options.sentryDsn) {
    deprecated.push('"SENTRY_DSN"');
    options.sentryDsn = process.env.SENTRY_DSN;
  }
  const { level, ...getTransformStreamOptions } = options;

  const pinoOptions: LoggerOptions = { level, name: "probot" };
  const transform = getTransformStream(getTransformStreamOptions);
  transform.pipe(pino.destination(1));
  const log = pino(pinoOptions, transform);

  if (deprecated.length) {
    log.warn(`[probot] Using the following environment variable(s) with the Probot constructor is deprecated: ${deprecated.join(
      ", "
    )}. Pass a custom log instance instead:
      
import { Probot } from "probot";
import pino from "pino";
import { getTransformStream } from "@probot/pino";

const transform = getTransformStream({
  level: "info",
  logFormat: "pretty",
  logLevelInString: false,
  sentryDsn: "https://1234abcd@sentry.io/12345
});

transform.pipe(pino.destination(1));
const log = pino(pinoOptions, transform);

new Probot({ log });`);
  }

  return log;
}
