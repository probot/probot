import type { Logger } from "pino";

import type { DeprecatedLogger } from "../types";

/**
 * `probot.log()`, `app.log()` and `context.log()` are aliasing `.log.info()`.
 * We will probably remove the aliasing in future.
 */
export function aliasLog(log: Logger): DeprecatedLogger {
  function logInfo() {
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
