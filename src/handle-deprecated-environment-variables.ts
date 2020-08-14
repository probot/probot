import { getLog } from "./get-log";

export function handleDeprecatedEnvironmentVariables() {
  const log = getLog();

  // TODO: remove in v11
  if ("DISABLE_STATS" in process.env) {
    // tslint:disable:no-console
    log.warn('[probot] "DISABLE_STATS" has been removed in v10');
  }

  if ("IGNORED_ACCOUNTS" in process.env) {
    // tslint:disable:no-console
    log.warn('[probot] "IGNORED_ACCOUNTS" has been removed in v10');
  }
}
