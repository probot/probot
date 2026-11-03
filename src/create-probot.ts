import { getPrivateKey } from "@probot/get-private-key";

import type { Env, Options } from "./types.js";
import { Probot } from "./probot.js";
import { defaultWebhookPath } from "./server/server.js";
import { validateLogFormat } from "./helpers/validate-log-format.js";
import { validateLogLevel } from "./helpers/validate-log-level.js";

type CreateProbotOptions = {
  overrides?: Options;
  defaults?: Options;
  env?: Partial<Env> | undefined;
};

const DEFAULTS: Partial<Env> = {
  APP_ID: "",
  WEBHOOK_SECRET: "",
  WEBHOOK_PATH: defaultWebhookPath,
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
}: CreateProbotOptions = {}): Probot {
  let privateKey;

  try {
    privateKey = getPrivateKey({ env });
  } catch {}

  const envWithDefaults = { ...DEFAULTS, ...env };

  const envLogFormat =
    envWithDefaults.LOG_FORMAT === ""
      ? envWithDefaults.NODE_ENV === "production"
        ? "json"
        : "pretty"
      : envWithDefaults.LOG_FORMAT;

  const envOptions = {
    logLevel: envWithDefaults.LOG_LEVEL,
    logFormat: envLogFormat,
    ...(env.APP_ID ? { appId: Number(env.APP_ID) } : {}),
    ...(privateKey ? { privateKey: privateKey.toString() } : {}),
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

  const { logLevel, logFormat } = probotOptions;
  if (logLevel !== undefined) {
    validateLogLevel(logLevel);
  }
  if (logFormat !== undefined) {
    validateLogFormat(logFormat);
  }

  return new Probot({
    log: probotOptions.log,
    logLevelInString: envWithDefaults.LOG_LEVEL_IN_STRING === "true",
    logMessageKey: envWithDefaults.LOG_MESSAGE_KEY,
    sentryDsn: envWithDefaults.SENTRY_DSN,
    ...probotOptions,
    logLevel,
    logFormat,
  });
}
