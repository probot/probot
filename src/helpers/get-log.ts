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
import { pino } from "pino";
import type { Logger, LoggerOptions } from "pino";
import { getTransformStream, type Options, type LogLevel } from "@probot/pino";

export type GetLogOptions = {
  level?: LogLevel | undefined;
  logMessageKey?: string | undefined;
} & Options;

export async function getLog(options: GetLogOptions = {}): Promise<Logger> {
  const { level, logMessageKey, ...getTransformStreamOptions } = options;

  const pinoOptions: LoggerOptions = {
    level: level || "info",
    name: "probot",
    messageKey: logMessageKey || "msg",
  };
  const transform = await getTransformStream(getTransformStreamOptions);
  transform.pipe(pino.destination(1) as unknown as NodeJS.WritableStream);

  return pino(pinoOptions, transform);
}
