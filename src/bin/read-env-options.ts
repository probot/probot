import { getPrivateKey } from "@probot/get-private-key";
import { Options as PinoOptions, LogLevel } from "@probot/pino";

export function readEnvOptions() {
  const privateKey = getPrivateKey();

  return {
    privateKey: (privateKey && privateKey.toString()) || undefined,
    id: Number(process.env.APP_ID),
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST,
    secret: process.env.WEBHOOK_SECRET,
    webhookPath: process.env.WEBHOOK_PATH,
    webhookProxy: process.env.WEBHOOK_PROXY_URL,
    logLevel: process.env.LOG_LEVEL as LogLevel,
    logFormat: process.env.LOG_FORMAT as PinoOptions["logFormat"],
    logLevelInString: process.env.LOG_LEVEL_IN_STRING === "true",
    sentryDsn: process.env.SENTRY_DSN,
    redisConfig: process.env.REDIS_URL,
    baseUrl: process.env.GHE_HOST
      ? `${process.env.GHE_PROTOCOL || "https"}://${
          process.env.GHE_HOST
        }/api/v3`
      : "https://api.github.com",
  };
}
