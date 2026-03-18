import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";
import type { Logger } from "pino";

import type { ProbotOctokit } from "./probot-octokit.js";
import { Context } from "../context.js";

type WebhookTransformOptions<OctokitType extends ProbotOctokit> = {
  log: Logger;
  octokit: OctokitType;
};

/**
 * Probot's transform option, which extends the `event` object that is passed
 * to webhook event handlers by `@octokit/webhooks`
 * @see https://github.com/octokit/webhooks.js/#constructor
 */
export async function webhookTransform<OctokitType extends ProbotOctokit>(
  options: WebhookTransformOptions<OctokitType>,
  event: WebhookEvent,
) {
  const octokit = (await options.octokit.auth({
    type: "event-octokit",
    event,
  })) as OctokitType;
  const log = options.log.child({ name: "event", id: event.id });
  return new Context(event, octokit, log);
}
