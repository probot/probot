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

  try {
    const github = await getAuthenticatedOctokitForEvent(state, event);
    return new Context(event, github, log);
  } catch (err) {
    // avoid the error.code deprecation message
    // can be replaced with `log.error({ err, event, ...err })` once @octokit/request-error v3 is used
    const { name, message, stack, headers, request, status } = err;
    state.log.error({
      err: {
        name,
        message,
        stack,
      },
      event,
      headers,
      request,
      status,
    });
    throw err;
  }
}
