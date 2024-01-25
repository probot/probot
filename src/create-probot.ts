import type { LogLevel, Options as PinoOptions } from "@probot/pino";
import { getPrivateKey } from "@probot/get-private-key";

import { getLog } from "./helpers/get-log.js";
import type { Options } from "./types.js";
import { Probot } from "./probot.js";
import { defaultWebhooksPath } from "./server/server.js";

type CreateProbotOptions = {
  overrides?: Options;
  defaults?: Options;
  env?: Partial<NodeJS.ProcessEnv>;
};

const DEFAULTS: Partial<NodeJS.ProcessEnv> = {
  APP_ID: "",
  WEBHOOK_SECRET: "",
  WEBHOOK_PATH: defaultWebhooksPath,
  GHE_HOST: "",
  GHE_PROTOCOL: "https",
  LOG_FORMAT: undefined,
  LOG_LEVEL: "warn",
  LOG_LEVEL_IN_STRING: "false",
  LOG_MESSAGE_KEY: "msg",
  REDIS_URL: "",
  SENTRY_DSN: "",
};

/**
 * Merges configuration from defaults/environment variables/overrides and returns
 * a Probot instance. Finds private key using [`@probot/get-private-key`](https://github.com/probot/get-private-key).
 *
 * @see https://probot.github.io/docs/configuration/
 * @param defaults default Options, will be overwritten if according environment variable is set
 * @param overrides overwrites defaults and according environment variables
 * @param env defaults to process.env
 */
export function createProbot({
  overrides = {},
  defaults = {},
  env = process.env,
}: CreateProbotOptions = {}) {
  const privateKey = getPrivateKey({ env });
  const envWithDefaults = { ...DEFAULTS, ...env };

  const envOptions: Options = {
    logLevel: envWithDefaults.LOG_LEVEL as LogLevel,
    appId: Number(envWithDefaults.APP_ID),
    privateKey: (privateKey && privateKey.toString()) || undefined,
    secret: envWithDefaults.WEBHOOK_SECRET,
    redisConfig: envWithDefaults.REDIS_URL,
    webhookPath: envWithDefaults.WEBHOOK_PATH,
    baseUrl: envWithDefaults.GHE_HOST
      ? `${envWithDefaults.GHE_PROTOCOL || "https"}://${
          envWithDefaults.GHE_HOST
        }/api/v3`
      : "https://api.github.com",
  };

  const probotOptions = {
    ...defaults,
    ...envOptions,
    ...overrides,
  };

  const log = getLog({
    level: probotOptions.logLevel,
    logFormat: envWithDefaults.LOG_FORMAT as PinoOptions["logFormat"],
    logLevelInString: envWithDefaults.LOG_LEVEL_IN_STRING === "true",
    logMessageKey: envWithDefaults.LOG_MESSAGE_KEY,
    sentryDsn: envWithDefaults.SENTRY_DSN,
  }).child({ name: "server" });

  return new Probot({
    log: log.child({ name: "probot" }),
    ...probotOptions,
  });
}
