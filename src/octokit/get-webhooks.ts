import { Webhooks } from "@octokit/webhooks";
import type { Logger } from "pino";

import type { ProbotOctokit } from "./probot-octokit.js";
import type { ProbotWebhooks } from "../types.js";

import { getErrorHandler } from "../helpers/get-error-handler.js";
import { webhookTransform } from "./octokit-webhooks-transform.js";

type GetWebhooksOptions<Octokit extends ProbotOctokit> = {
  log: Logger;
  octokit: Octokit;
  webhookSecret: string;
};

export function getWebhooks<Octokit extends ProbotOctokit>(
  options: GetWebhooksOptions<Octokit>,
): ProbotWebhooks<Octokit> {
  const webhooks = new Webhooks({
    log: options.log,
    secret: options.webhookSecret,
    transform: (event) => webhookTransform(options, event),
  });
  webhooks.onError(getErrorHandler(options.log));
  return webhooks;
}
