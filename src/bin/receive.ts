// Usage: probot receive -e push -p path/to/payload app.js
import fs from "node:fs";
import path from "node:path";
import { randomUUID as uuidv4 } from "node:crypto";
import { parseArgs } from "node:util";

import { validateEventName } from "@octokit/webhooks";
import { getPrivateKey } from "@probot/get-private-key";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ quiet: true });

import { getLog } from "../helpers/get-log.js";
import { Probot } from "../probot.js";

import { resolveAppFunction } from "../helpers/resolve-app-function.js";
import { validateLogFormat } from "../helpers/validate-log-format.js";
import { validateLogLevel } from "../helpers/validate-log-level.js";

function printHelp() {
  console.log(`Usage: probot receive [options] [path/to/app.js...]

Options:
  -e, --event <event-name>           Event name
  -p, --payload-path <payload-path>  Path to the event payload
  -t, --token <access-token>         Access token
  -a, --app <id>                     ID of the GitHub App (default: "foo")
  -P, --private-key <file>           Path to private key file (.pem) for the GitHub App
  -L, --log-level <level>            One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal" (default: "info")
  --log-format <format>              One of: "pretty", "json" (default: "pretty")
  --log-level-in-string              Set to log levels (trace, debug, info, ...) as words instead of numbers (10, 20, 30, ...) (default: false)
  --log-message-key                  Set to the string key for the 'message' in the log JSON object
  --sentry-dsn <dsn>                 Set to your Sentry DSN, e.g. "https://1234abcd@sentry.io/12345"
  --base-url <url>                   GitHub API base URL. If you use GitHub Enterprise Server, and your hostname is "https://github.acme-inc.com", then the root URL
                                      is "https://github.acme-inc.com/api/v3" (default: "https://api.github.com")
  -h, --help                         display help for command
`);
}

export async function receive(args: string[]) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      event: {
        type: "string" as const,
        short: "e",
        default: process.env.GITHUB_EVENT_NAME,
      },
      "payload-path": {
        type: "string",
        short: "p",
        default: process.env.GITHUB_EVENT_PATH,
      },
      token: {
        type: "string",
        short: "t",
        default: process.env.GITHUB_TOKEN,
      },
      app: {
        type: "string",
        short: "a",
        default: process.env.APP_ID || "foo",
      },
      "private-key": {
        type: "string",
        short: "P",
        default: process.env.PRIVATE_KEY_PATH,
      },
      "log-level": {
        type: "string",
        short: "L",
        default: process.env.LOG_LEVEL || "info",
      },
      "log-format": {
        type: "string",
        default: process.env.LOG_LEVEL || "pretty",
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
      "base-url": {
        type: "string",
        default: process.env.GHE_HOST
          ? `${process.env.GHE_PROTOCOL || "https"}://${
              process.env.GHE_HOST
            }/api/v3`
          : "https://api.github.com",
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    args,
  });

  const {
    app: appId,
    "base-url": baseUrl,
    token: githubToken,
    event,
    "payload-path": payloadPath,
    "log-level": logLevel,
    "log-format": logFormat,
    "log-level-in-string": logLevelInString,
    "log-message-key": logMessageKey,
    "sentry-dsn": sentryDsn,
    help,
  } = values;

  if (!event || !payloadPath || help) {
    printHelp();
    return;
  }

  validateEventName(event);
  validateLogLevel(logLevel);
  validateLogFormat(logFormat);

  const appFunctionFile = positionals[0];

  if (!appFunctionFile) {
    console.error("No app function file specified");
    process.exit(1);
  }

  let privateKey;

  try {
    privateKey = getPrivateKey();
  } catch {}

  if (!githubToken && (!appId || !privateKey)) {
    console.warn(
      "No token specified and no certificate found, which means you will not be able to do authenticated requests to GitHub",
    );
  }

  const payload = JSON.parse(
    fs.readFileSync(path.resolve(payloadPath), "utf8"),
  );

  const log = await getLog({
    level: logLevel,
    logFormat,
    logLevelInString,
    logMessageKey,
    sentryDsn,
  });

  const probot = new Probot({
    appId,
    privateKey: String(privateKey),
    githubToken: githubToken,
    log,
    baseUrl: baseUrl,
  });

  const appFn = await resolveAppFunction(
    path.resolve(process.cwd(), appFunctionFile),
  );

  await probot.load(appFn, {
    cwd: process.cwd(),
    addHandler: () => {
      throw new Error("No server instance");
    },
  });

  log.debug("Receiving event", event);

  probot.receive({ name: event as any, payload, id: uuidv4() }).catch(() => {
    // Process must exist non-zero to indicate that the action failed to run
    process.exit(1);
  });
}
