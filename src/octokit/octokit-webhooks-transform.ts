import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";
import type { Logger } from "pino";

import { Context } from "../context.js";
import type { ProbotOctokit } from "../exports.js";

type WebhookTransformOptions = {
  octokit: ProbotOctokit;
  log: Logger;
};

/**
 * Probot's transform option, which extends the `event` object that is passed
 * to webhook event handlers by `@octokit/webhooks`
 * @see https://github.com/octokit/webhooks.js/#constructor
 */
export async function webhookTransform(
  options: WebhookTransformOptions,
  event: WebhookEvent,
) {
  const log = options.log.child({ name: "event", id: event.id });
  const octokit = (await options.octokit.auth({
    type: "event-octokit",
    event,
  })) as ProbotOctokit;
  return new Context(event, octokit, log);
}
