// Usage: probot receive -e push -p path/to/payload app.js

require("dotenv").config();

import path from "path";
import { v4 as uuidv4 } from "uuid";
import program from "commander";
import { getPrivateKey } from "@probot/get-private-key";
import { getLog } from "../helpers/get-log";

import { Probot } from "../";
import { resolveAppFunction } from "../helpers/resolve-app-function";

async function main() {
  program
    .usage("[options] [path/to/app.js...]")
    .option(
      "-e, --event <event-name>",
      "Event name",
      process.env.GITHUB_EVENT_NAME
    )
    .option(
      "-p, --payload-path <payload-path>",
      "Path to the event payload",
      process.env.GITHUB_EVENT_PATH
    )
    .option(
      "-t, --token <access-token>",
      "Access token",
      process.env.GITHUB_TOKEN
    )
    .option("-a, --app <id>", "ID of the GitHub App", process.env.APP_ID)
    .option(
      "-P, --private-key <file>",
      "Path to private key file (.pem) for the GitHub App",
      process.env.PRIVATE_KEY_PATH
    )
    .option(
      "-L, --log-level <level>",
      'One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal"',
      process.env.LOG_LEVEL
    )
    .option(
      "--log-format <format>",
      'One of: "pretty", "json"',
      process.env.LOG_LEVEL || "pretty"
    )
    .option(
      "--log-level-in-string",
      "Set to log levels (trace, debug, info, ...) as words instead of numbers (10, 20, 30, ...)",
      process.env.LOG_LEVEL_IN_STRING === "true"
    )
    .option(
      "--log-message-key",
      "Set to the string key for the 'message' in the log JSON object",
      process.env.LOG_MESSAGE_KEY || "msg"
    )
    .option(
      "--sentry-dsn <dsn>",
      'Set to your Sentry DSN, e.g. "https://1234abcd@sentry.io/12345"',
      process.env.SENTRY_DSN
    )
    .parse(process.argv);

  const githubToken = program.token;

  if (!program.event || !program.payloadPath) {
    program.help();
  }

  const privateKey = getPrivateKey();
  if (!githubToken && (!program.app || !privateKey)) {
    console.warn(
      "No token specified and no certificate found, which means you will not be able to do authenticated requests to GitHub"
    );
  }

  const payload = require(path.resolve(program.payloadPath));
  const log = getLog({
    level: program.logLevel,
    logFormat: program.logFormat,
    logLevelInString: program.logLevelInString,
    logMessageKey: program.logMessageKey,
    sentryDsn: program.sentryDsn,
  });

  const probot = new Probot({
    appId: program.app,
    privateKey: String(privateKey),
    githubToken: githubToken,
    log,
  });

  const appFn = await resolveAppFunction(
    path.resolve(process.cwd(), program.args[0])
  );
  probot.load(appFn);

  probot.log.debug("Receiving event", program.event);
  probot.receive({ name: program.event, payload, id: uuidv4() }).catch(() => {
    // Process must exist non-zero to indicate that the action failed to run
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
