import { parseArgs } from "node:util";
import { getPrivateKey } from "@probot/get-private-key";
import type { Options as PinoOptions } from "@probot/pino";

import type { Options } from "../types.js";
import { validateLogLevel } from "../helpers/validate-log-level.js";
import { validateLogFormat } from "../helpers/validate-log-format.js";

function printHelp() {
  console.log(`Usage: probot-run [options] <apps...>

Options:
  -p, --port <n>             Port to start the server on (default: "3000")
  -H --host <host>           Host to start the server on
  -W, --webhook-proxy <url>  URL of the webhook proxy service. (default: "https://smee.io/0qeZM0TH2KgUZVu")
  -w, --webhook-path <path>  URL path which receives webhooks. Ex: "/webhook"
  -a, --app <id>             ID of the GitHub App (default: "foo")
  -s, --secret <secret>      Webhook secret of the GitHub App (default: "baz")
  -P, --private-key <file>   Path to private key file (.pem) for the GitHub App
  -L, --log-level <level>    One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal" (default: "info")
  --log-format <format>      One of: "pretty", "json"
  --log-level-in-string      Set to log levels (trace, debug, info, ...) as words instead of numbers (10, 20, 30, ...) (default: false)
  --log-message-key                  Set to the string key for the 'message' in the log JSON object
  --sentry-dsn <dsn>         Set to your Sentry DSN, e.g. "https://1234abcd@sentry.io/12345"
  --redis-url <url>          Set to a "redis://" url in order to enable cluster support for request throttling. Example:
                             "redis://:secret@redis-123.redislabs.com:12345/0"
  --base-url <url>           GitHub API base URL. If you use GitHub Enterprise Server, and your hostname is "https://github.acme-inc.com", then the root URL is
                             "https://github.acme-inc.com/api/v3" (default: "https://api.github.com")
  -h, --help                 display help for command`);
}

export function readCliOptions(
  args: string[],
): Options & PinoOptions & { args: string[] } {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      port: {
        type: "string",
        short: "p",
        default: String(process.env.PORT || 3000),
      },
      host: {
        type: "string",
        default: process.env.HOST,
      },
      "webhook-proxy": {
        type: "string",
        default: process.env.WEBHOOK_PROXY_URL,
      },
      "webhook-path": {
        type: "string",
        default: process.env.WEBHOOK_PATH,
      },
      app: {
        type: "string",
        default: process.env.APP_ID,
      },
      secret: {
        type: "string",
        default: process.env.WEBHOOK_SECRET,
      },
      "private-key": {
        type: "string",
        default: process.env.PRIVATE_KEY_PATH,
      },
      "log-level": {
        type: "string",
        default: process.env.LOG_LEVEL || "info",
      },
      "log-format": {
        type: "string",
        default: process.env.LOG_FORMAT || "pretty",
      },
      "log-level-in-string": {
        type: "boolean",
        default: process.env.LOG_LEVEL_IN_STRING === "true",
      },
      "log-message-key": {
        type: "string",
        default: process.env.LOG_MESSAGE_KEY || "msg",
      },
      "sentry-dsn": {
        type: "string",
        default: process.env.SENTRY_DSN,
      },
      "redis-url": {
        type: "string",
        default: process.env.REDIS_URL,
      },
      "base-url": {
        type: "string",
        default: process.env.GHE_HOST
          ? `${process.env.GHE_PROTOCOL || "https"}://${
              process.env.GHE_HOST
            }/api/v3`
          : "https://api.github.com",
      },
    },
    args: args.length > 2 ? args.slice(2) : args,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  validateLogFormat(values["log-format"]);
  validateLogLevel(values["log-level"]);

  let privateKey;

  try {
    privateKey =
      getPrivateKey({ filepath: values["private-key"] }) || undefined;
  } catch {}

  return {
    privateKey,
    appId: values["app"],
    redisConfig: values["redis-url"],
    args: positionals,
    baseUrl: values["base-url"],
    host: values.host,
    port: Number(values.port),
    secret: values.secret,
    webhookPath: values["webhook-path"],
    webhookProxy: values["webhook-proxy"],
    logLevel: values["log-level"],
    sentryDsn: values["sentry-dsn"],
    logFormat: values["log-format"],
    logLevelInString: values["log-level-in-string"],
    logMessageKey: values["log-message-key"],
  };
}
