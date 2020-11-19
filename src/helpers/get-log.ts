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
import pino from "pino";
import type { LoggerOptions } from "pino";
import { getTransformStream } from "@probot/pino";

export function getLog(level: string = "info") {
  const pinoOptions: LoggerOptions = { level, name: "probot" };
  const transform = getTransformStream();
  transform.pipe(pino.destination(1));
  return pino(pinoOptions, transform);
}
