import type { Logger } from "pino";
import { Webhooks } from "@octokit/webhooks";

import type { ProbotOctokit } from "../exports.js";
import type { ProbotWebhooks } from "../types.js";
import { getErrorHandler } from "../helpers/get-error-handler.js";
import { webhookTransform } from "./octokit-webhooks-transform.js";

type GetWebhooksOptions = {
  log: Logger;
  webhooksSecret?: string;
  octokit: ProbotOctokit;
};

export function getWebhooks(options: GetWebhooksOptions): ProbotWebhooks {
  const webhooks = new Webhooks({
    log: options.log,
    secret: options.webhooksSecret!,
    transform: (hook) => webhookTransform(options, hook),
  });
  webhooks.onError(getErrorHandler(options.log));
  return webhooks;
}
