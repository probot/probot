import { getPrivateKey } from "@probot/get-private-key";
import type { Options as PinoOptions } from "@probot/pino";

export function readEnvOptions(env = process.env) {
  let privateKey;

  try {
    privateKey = getPrivateKey({ env });
  } catch (e) {
    console.error(e);
  }

  const logFormat: PinoOptions["logFormat"] =
    env.LOG_FORMAT && env.LOG_FORMAT.length !== 0
      ? env.LOG_FORMAT === "pretty"
        ? "pretty"
        : "json"
      : env.NODE_ENV === "production"
        ? "json"
        : "pretty";

  const port =
    env.PORT === undefined || env.PORT === "" ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be an integer between 1 and 65535");
  }

  const appId =
    env.APP_ID === undefined || env.APP_ID === ""
      ? undefined
      : Number(env.APP_ID);
  if (appId !== undefined && (!Number.isSafeInteger(appId) || appId <= 0)) {
    throw new Error("app ID must be a positive integer");
  }

  return {
    args: [],
    privateKey: (privateKey && privateKey.toString()) || undefined,
    appId,
    port,
    host: env.HOST,
    secret: env.WEBHOOK_SECRET,
    webhookPath: env.WEBHOOK_PATH,
    webhookProxy: env.WEBHOOK_PROXY_URL,
    logLevel: env.LOG_LEVEL,
    logFormat: logFormat,
    logLevelInString: env.LOG_LEVEL_IN_STRING === "true",
    logMessageKey: env.LOG_MESSAGE_KEY,
    sentryDsn: env.SENTRY_DSN,
    redisConfig: env.REDIS_URL,
    baseUrl: env.GHE_HOST
      ? `${env.GHE_PROTOCOL || "https"}://${env.GHE_HOST}/api/v3`
      : "https://api.github.com",
  };
}
