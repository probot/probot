import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";
import type { Logger } from "pino";

import type { ProbotOctokit } from "./probot-octokit.js";
import { Context } from "../context.js";

type WebhookTransformOptions<Octokit extends ProbotOctokit> = {
  log: Logger;
  octokit: Octokit;
};

/**
 * Probot's transform option, which extends the `event` object that is passed
 * to webhook event handlers by `@octokit/webhooks`
 * @see https://github.com/octokit/webhooks.js/#constructor
 */
export async function webhookTransform<Octokit extends ProbotOctokit>(
  options: WebhookTransformOptions<Octokit>,
  event: WebhookEvent,
) {
  const octokit = (await options.octokit.auth({
    type: "event-octokit",
    event,
  })) as Octokit;
  const log = options.log.child({ name: "event", id: event.id });
  return new Context(event, octokit, log);
}
