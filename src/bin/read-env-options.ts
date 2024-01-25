import { getPrivateKey } from "@probot/get-private-key";
import type { Options as PinoOptions, LogLevel } from "@probot/pino";

export function readEnvOptions(env = process.env) {
  const privateKey = getPrivateKey({ env });

  const logFormat: PinoOptions["logFormat"] =
    env.LOG_FORMAT && env.LOG_FORMAT.length !== 0
      ? env.LOG_FORMAT === "pretty"
        ? "pretty"
        : "json"
      : env.NODE_ENV === "production"
        ? "json"
        : "pretty";

  return {
    args: [],
    privateKey: (privateKey && privateKey.toString()) || undefined,
    appId: Number(env.APP_ID),
    port: Number(env.PORT) || 3000,
    host: env.HOST,
    secret: env.WEBHOOK_SECRET,
    webhookPath: env.WEBHOOK_PATH,
    webhookProxy: env.WEBHOOK_PROXY_URL,
    logLevel: env.LOG_LEVEL as LogLevel,
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
