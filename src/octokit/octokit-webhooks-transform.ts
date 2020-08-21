import { WebhookEvent } from "@octokit/webhooks";

import { getAuthenticatedOctokitForEvent } from "./get-authenticated-octokit-for-event";
import { Context } from "../context";
import { State } from "../types";

/**
 * Probot's transform option, which extends the `event` object that is passed
 * to webhook event handlers by `@octokit/webhooks`
 * @see https://github.com/octokit/webhooks.js/#constructor
 */
export async function webhookTransform(state: State, event: WebhookEvent) {
  const log = state.log.child({ name: "event", id: event.id });
  const github = await getAuthenticatedOctokitForEvent(state, event);
  return new Context(event, github, log);
}
