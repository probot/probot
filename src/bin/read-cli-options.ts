import program from "commander";
import { getPrivateKey } from "@probot/get-private-key";
import { Options as PinoOptions } from "@probot/pino";

import { Options } from "../types";

export function readCliOptions(
  argv: string[]
): Options & PinoOptions & { args: string[] } {
  program
    .usage("[options] <apps...>")
    .option(
      "-p, --port <n>",
      "Port to start the server on",
      String(process.env.PORT || 3000)
    )
    .option("-H --host <host>", "Host to start the server on", process.env.HOST)
    .option(
      "-W, --webhook-proxy <url>",
      "URL of the webhook proxy service.`",
      process.env.WEBHOOK_PROXY_URL
    )
    .option(
      "-w, --webhook-path <path>",
      "URL path which receives webhooks. Ex: `/webhook`",
      process.env.WEBHOOK_PATH
    )
    .option("-a, --app <id>", "ID of the GitHub App", process.env.APP_ID)
    .option(
      "-s, --secret <secret>",
      "Webhook secret of the GitHub App",
      process.env.WEBHOOK_SECRET
    )
    .option(
      "-P, --private-key <file>",
      "Path to private key file (.pem) for the GitHub App",
      process.env.PRIVATE_KEY_PATH
    )
    .option(
      "-L, --log-level <level>",
      'One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal"',
      process.env.LOG_LEVEL || "info"
    )
    .option(
      "--log-format <format>",
      'One of: "pretty", "json"',
      process.env.LOG_FORMAT || "pretty"
    )
    .option(
      "--log-level-in-string",
      "Set to log levels (trace, debug, info, ...) as words instead of numbers (10, 20, 30, ...)",
      process.env.LOG_LEVEL_IN_STRING === "true"
    )
    .option(
      "--sentry-dsn <dsn>",
      'Set to your Sentry DSN, e.g. "https://1234abcd@sentry.io/12345"',
      process.env.SENTRY_DSN
    )
    .option(
      "--redis-url <url>",
      'Set to a "redis://" url in order to enable cluster support for request throttling. Example: "redis://:secret@redis-123.redislabs.com:12345/0"',
      process.env.REDIS_URL
    )
    .option(
      "--base-url <url>",
      'GitHub API base URL. If you use GitHub Enterprise Server, and your hostname is "https://github.acme-inc.com", then the root URL is "https://github.acme-inc.com/api/v3"',
      process.env.GHE_HOST
        ? `${process.env.GHE_PROTOCOL || "https"}://${
            process.env.GHE_HOST
          }/api/v3`
        : "https://api.github.com"
    )
    .parse(argv);

  const {
    app: appId,
    privateKey: privateKeyPath,
    redisUrl,
    ...options
  } = program;

  return {
    privateKey: getPrivateKey({ filepath: privateKeyPath }) || undefined,
    appId,
    redisConfig: redisUrl,
    ...options,
  };
}
