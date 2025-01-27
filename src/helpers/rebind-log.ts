import type { Logger } from "pino";

export function rebindLog(log: Logger): Logger {
  for (const key in log) {
    // @ts-expect-error
    if (typeof log[key] !== "function") continue;
    // @ts-expect-error
    log[key] = log[key].bind(log);
  }
  return log;
}
