import { getPrivateKey } from "@probot/get-private-key";
import { Options as PinoOptions, LogLevel } from "@probot/pino";

import { getLog, GetLogOptions } from "./helpers/get-log";
import { Probot } from "./probot";
import { Options, ServerOptions } from "./types";

type Parameters = {
  overrides?: Partial<ServerOptions>;
  defaults?: Partial<ServerOptions>;
  env?: NodeJS.ProcessEnv;
};

const DEFAULTS = {
  APP_ID: "",
  GHE_HOST: "",
  GHE_PROTOCOL: "",
  HOST: "",
  LOG_FORMAT: "",
  LOG_LEVEL: "warn",
  LOG_LEVEL_IN_STRING: "",
  PORT: "3000",
  REDIS_URL: "",
  SENTRY_DSN: "",
  WEBHOOK_PATH: "",
  WEBHOOK_PROXY_URL: "",
  WEBHOOK_SECRET: "",
};

/**
 * Merges configuration from defaults, environment variables, and overrides.
 * Finds private key using [`@probot/get-private-key`](https://github.com/probot/get-private-key).
 *
 * @see https://probot.github.io/docs/configuration/
 * @param defaults default Options, will be overwritten if according environment variable is set
 * @param overrides overwrites defaults and according environment variables
 * @param env defaults to process.env
 */
export function getOptions(
  {
    overrides = {},
    defaults = {},
    env = process.env,
  }: Parameters = {} as Parameters
): ServerOptions {
  const privateKey = getPrivateKey({ env });
  const envWithDefaults = { ...DEFAULTS, ...env };

  const logOptions: GetLogOptions = {
    level: envWithDefaults.LOG_LEVEL as LogLevel,
    logFormat: envWithDefaults.LOG_FORMAT as PinoOptions["logFormat"],
    logLevelInString: envWithDefaults.LOG_LEVEL_IN_STRING === "true",
    sentryDsn: envWithDefaults.SENTRY_DSN,
  };

  const probotOptions: Options = {
    appId: Number(envWithDefaults.APP_ID),
    privateKey: (privateKey && privateKey.toString()) || undefined,
    secret: envWithDefaults.WEBHOOK_SECRET,
    redisConfig: envWithDefaults.REDIS_URL,
    baseUrl: envWithDefaults.GHE_HOST
      ? `${envWithDefaults.GHE_PROTOCOL || "https"}://${
          envWithDefaults.GHE_HOST
        }/api/v3`
      : "https://api.github.com",
  };

  const log = getLog(logOptions).child({ name: "server" });

  const ProbotWithDefaults = Probot.defaults({
    ...probotOptions,
    log: log.child({ name: "probot" }),
  });

  return {
    ...defaults,
    host: envWithDefaults.HOST,
    port: Number(envWithDefaults.PORT),
    webhookPath: envWithDefaults.WEBHOOK_PATH,
    webhookProxy: envWithDefaults.WEBHOOK_PROXY_URL,
    log,
    Probot: ProbotWithDefaults,
    ...overrides,
  };
}
