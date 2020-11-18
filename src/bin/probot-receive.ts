// Usage: probot receive -e push -p path/to/payload app.js

require("dotenv").config();

import path from "path";
import { v4 as uuidv4 } from "uuid";
import program from "commander";
import { getPrivateKey } from "@probot/get-private-key";

import { Probot } from "../";
import { logWarningsForObsoleteEnvironmentVariables } from "../helpers/log-warnings-for-obsolete-environment-variables";

logWarningsForObsoleteEnvironmentVariables();

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
    "Path to certificate of the GitHub App",
    process.env.PRIVATE_KEY_PATH
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

const probot = new Probot({
  id: program.app,
  privateKey: String(privateKey),
  githubToken: githubToken,
});

probot.setup(program.args);

probot.log.debug("Receiving event", program.event);
probot.receive({ name: program.event, payload, id: uuidv4() }).catch(() => {
  // Process must exist non-zero to indicate that the action failed to run
  process.exit(1);
});
