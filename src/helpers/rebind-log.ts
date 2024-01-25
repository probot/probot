import type { Logger } from "pino";

const kIsBound = Symbol("is-bound");

export function rebindLog(log: Logger): Logger {
  // @ts-ignore
  if (log[kIsBound]) return log;
  for (const key in log) {
    // @ts-ignore
    if (typeof log[key] !== "function") continue;
    // @ts-ignore
    log[key] = log[key].bind(log);
  }
  // @ts-ignore
  log[kIsBound] = true;
  return log;
}
