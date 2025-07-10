import type { Logger } from "pino";

export function rebindLog(log: Logger): Logger {
  for (const key in log) {
    // @ts-expect-error
    if (typeof log[key] !== "function") continue;
    // @ts-expect-error
    log[key] = log[key].bind(log);
  }

  const child = log.child;

  // @ts-ignore
  log.child = (...opts: Parameters<Logger["child"]>) => {
    const childLogger = child(...opts) as unknown as Logger;
    return rebindLog(childLogger);
  };

  return log;
}
