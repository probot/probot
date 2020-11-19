import { Deprecation } from "deprecation";
import { Logger } from "pino";

import { Application } from "./application";
import { Context, WebhookPayloadWithRepository } from "./context";
import { getLog } from "./helpers/get-log";
import { logWarningsForObsoleteEnvironmentVariables } from "./helpers/log-warnings-for-obsolete-environment-variables";
import { Options } from "./types";
import { Probot } from "./probot";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { run } from "./run";

logWarningsForObsoleteEnvironmentVariables();

export const createProbot = (options: Options) => {
  options.log = options.log || getLog();
  options.log.warn(
    new Deprecation(
      `[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead`
    )
  );
  return new Probot(options);
};

export { Logger, Context, Application, ProbotOctokit, run, Probot };

/** NOTE: exported types might change at any point in time */
export { Options, WebhookPayloadWithRepository };
