#!/usr/bin/env node
// Usage: probot receive -e push -p path/to/payload app.js

require("dotenv").config();

const path = require("path");
const uuid = require("uuid");
const program = require("commander");

const { findPrivateKey } = require("../lib/helpers/get-private-key");
const {
  logWarningsForObsoleteEnvironmentVariables,
} = require("../lib/helpers/log-warnings-for-obsolete-environment-variables");
const { Probot } = require("../");

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
    findPrivateKey
  )
  .parse(process.argv);

const githubToken = program.token;

if (!program.event || !program.payloadPath) {
  program.help();
}

const privateKey = findPrivateKey();
if (!githubToken && (!program.app || !privateKey)) {
  console.warn(
    "No token specified and no certificate found, which means you will not be able to do authenticated requests to GitHub"
  );
}

const payload = require(path.resolve(program.payloadPath));

const probot = new Probot({
  id: program.app,
  privateKey,
  githubToken: githubToken,
});

probot.setup(program.args);

probot.logger.debug("Receiving event", program.event);
probot.receive({ name: program.event, payload, id: uuid.v4() }).catch(() => {
  // Process must exist non-zero to indicate that the action failed to run
  process.exit(1);
});
