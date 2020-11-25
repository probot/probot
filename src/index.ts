import { Deprecation } from "deprecation";
import { Logger } from "pino";
import { LogLevel, Options as PinoOptions } from "@probot/pino";

import { Application } from "./application";
import { Context, WebhookPayloadWithRepository } from "./context";
import { getLog } from "./helpers/get-log";
import { Options } from "./types";
import { Probot } from "./probot";
import { Server } from "./server/server";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { run } from "./run";
import { getOptions } from "./get-options";
import { createNodeMiddleware } from "./create-node-middleware";

export const createProbot = (options: Options) => {
  options.log =
    options.log ||
    getLog({
      level: process.env.LOG_LEVEL as LogLevel,
      logFormat: process.env.LOG_FORMAT as PinoOptions["logFormat"],
      logLevelInString: process.env.LOG_LEVEL_IN_STRING === "true",
      sentryDsn: process.env.SENTRY_DSN,
    });
  options.log.warn(
    new Deprecation(
      `[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead`
    )
  );
  return new Probot(options);
};

export {
  Logger,
  Context,
  Application,
  ProbotOctokit,
  run,
  Probot,
  Server,
  getOptions,
  createNodeMiddleware,
};

/** NOTE: exported types might change at any point in time */
export { Options, WebhookPayloadWithRepository };
