/**
 * A logger backed by [pino](https://getpino.io/)
 *
 * The default log level is `info`, but you can change it by setting the
 * `LOG_LEVEL` environment variable to `trace`, `debug`, `info`, `warn`,
 * `error`, or `fatal`.
 *
 * By default, logs are formatted for readability in development. If you intend
 * to drain logs to a logging service, set the `NODE_ENV` variable, e.g. `NODE_ENV=production probot run index.js`.
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
import pino from "pino";
import type { LoggerOptions } from "pino";
import { getTransformStream } from "@probot/pino";

export function getLog() {
  const pinoOptions: LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
    name: "probot",
  };

  const transform = getTransformStream();
  transform.pipe(pino.destination(1));
  return pino(pinoOptions, transform);
}
