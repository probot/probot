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

  if ("LOG_FORMAT" in process.env) {
    // tslint:disable:no-console
    log.warn(
      '[probot] "LOG_FORMAT" has been removed in v10. We now use https://getpino.io/ for logging. prettyPrint is enabled unless NODE_ENV is set to anything other than "development"'
    );
  }

  if ("LOG_LEVEL_IN_STRING" in process.env) {
    // tslint:disable:no-console
    log.warn(
      '[probot] "LOG_LEVEL_IN_STRING" has been removed in v10. Pipe the output to pino-text-level-transport instead. Example: `NODE_ENV=production probot run index.js | pino-text-level-transport`'
    );
  }

  if ("SENTRY_DSN" in process.env) {
    // tslint:disable:no-console
    log.warn(
      '[probot] "SENTRY_DSN" has been removed in v10. Use pino-sentry instead and make sure to set NODE_ENV. Example: `NODE_ENV=production probot run index.js | pino-sentry`'
    );
  }
}
