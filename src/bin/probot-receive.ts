// Usage: probot receive -e push -p path/to/payload app.js
import fs from "node:fs";
import path from "node:path";
import { randomUUID as uuidv4 } from "node:crypto";

import express, { Router } from "express";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { program } from "commander";
import { getPrivateKey } from "@probot/get-private-key";
import { getLog } from "../helpers/get-log.js";

import { Probot, type ApplicationFunctionOptions } from "../index.js";
import { resolveAppFunction } from "../helpers/resolve-app-function.js";

async function main() {
  program
    .usage("[options] [path/to/app.js...]")
    .option(
      "-e, --event <event-name>",
      "Event name",
      process.env.GITHUB_EVENT_NAME,
    )
    .option(
      "-p, --payload-path <payload-path>",
      "Path to the event payload",
      process.env.GITHUB_EVENT_PATH,
    )
    .option(
      "-t, --token <access-token>",
      "Access token",
      process.env.GITHUB_TOKEN,
    )
    .option("-a, --app <id>", "ID of the GitHub App", process.env.APP_ID)
    .option(
      "-P, --private-key <file>",
      "Path to private key file (.pem) for the GitHub App",
      process.env.PRIVATE_KEY_PATH,
    )
    .option(
      "-L, --log-level <level>",
      'One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal"',
      process.env.LOG_LEVEL,
    )
    .option(
      "--log-format <format>",
      'One of: "pretty", "json"',
      process.env.LOG_LEVEL || "pretty",
    )
    .option(
      "--log-level-in-string",
      "Set to log levels (trace, debug, info, ...) as words instead of numbers (10, 20, 30, ...)",
      process.env.LOG_LEVEL_IN_STRING === "true",
    )
    .option(
      "--log-message-key",
      "Set to the string key for the 'message' in the log JSON object",
      process.env.LOG_MESSAGE_KEY || "msg",
    )
    .option(
      "--sentry-dsn <dsn>",
      'Set to your Sentry DSN, e.g. "https://1234abcd@sentry.io/12345"',
      process.env.SENTRY_DSN,
    )
    .option(
      "--base-url <url>",
      'GitHub API base URL. If you use GitHub Enterprise Server, and your hostname is "https://github.acme-inc.com", then the root URL is "https://github.acme-inc.com/api/v3"',
      process.env.GHE_HOST
        ? `${process.env.GHE_PROTOCOL || "https"}://${
            process.env.GHE_HOST
          }/api/v3`
        : "https://api.github.com",
    )
    .parse(process.argv);

  const {
    app: appId,
    baseUrl,
    token: githubToken,
    event,
    payloadPath,
    logLevel,
    logFormat,
    logLevelInString,
    logMessageKey,
    sentryDsn,
  } = program.opts();

  if (!event || !payloadPath) {
    program.help();
  }

  const privateKey = getPrivateKey();
  if (!githubToken && (!appId || !privateKey)) {
    console.warn(
      "No token specified and no certificate found, which means you will not be able to do authenticated requests to GitHub",
    );
  }

  const payload = JSON.parse(
    fs.readFileSync(path.resolve(payloadPath), "utf8"),
  );
  const log = getLog({
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

  const expressApp = express();
  const options: ApplicationFunctionOptions = {
    getRouter: (path: string = "/") => {
      const newRouter = Router();
      expressApp.use(path, newRouter);
      return newRouter;
    },
  };

  const appFn = await resolveAppFunction(
    path.resolve(process.cwd(), program.args[0]),
  );
  await probot.load(appFn, options);

  probot.log.debug("Receiving event", event);
  probot.receive({ name: event, payload, id: uuidv4() }).catch(() => {
    // Process must exist non-zero to indicate that the action failed to run
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
