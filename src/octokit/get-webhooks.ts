import { Webhooks } from "@octokit/webhooks";
import type { Logger } from "pino";

import type { ProbotOctokit } from "./probot-octokit.js";
import type { ProbotWebhooks } from "../types.js";

import { getErrorHandler } from "../helpers/get-error-handler.js";
import { webhookTransform } from "./octokit-webhooks-transform.js";

type GetWebhooksOptions<OctokitType extends ProbotOctokit> = {
  log: Logger;
  octokit: OctokitType;
  webhookSecret: string;
};

export function getWebhooks<OctokitType extends ProbotOctokit>(
  options: GetWebhooksOptions<OctokitType>,
): ProbotWebhooks<OctokitType> {
  const webhooks = new Webhooks({
    log: options.log,
    secret: options.webhookSecret,
    transform: (event) => webhookTransform(options, event),
  });
  webhooks.onError(getErrorHandler(options.log));
  return webhooks;
}
