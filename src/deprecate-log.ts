import type { Logger } from "pino";
import { Deprecation } from "deprecation";

import type { DeprecatedLogger } from "./types";

/**
 * `app.log()` and `context.log()` were aliases for `.log.info()`.
 * The alias will be removed in v11
 */
export function deprecateLog(log: Logger): DeprecatedLogger {
  function logInfo() {
    log.warn(
      new Deprecation(
        '[probot] "app.log()" and "context.log()" are deprecated. Use "app.log.info()" and "context.log.info()" instead'
      )
    );
    // @ts-ignore
    log.info(...arguments);
  }

  for (const key in log) {
    // @ts-ignore
    logInfo[key] =
      typeof log[key] === "function" ? log[key].bind(log) : log[key];
  }

  // @ts-ignore
  return logInfo;
}
