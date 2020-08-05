import { WebhookEvent } from "@octokit/webhooks";
import { createUnauthenticatedAuth } from "@octokit/auth-unauthenticated";

import { getAuthenticatedOctokit } from "./get-authenticated-octokit";

import { State } from "./types";

export function getAuthenticatedOctokitForEvent(
  state: State,
  event: WebhookEvent
) {
  if (state.githubToken) return getAuthenticatedOctokit(state);

  if (isUnauthenticatedEvent(event)) {
    return new state.Octokit({
      authStrategy: createUnauthenticatedAuth,
      auth: {
        reason:
          "`context.github` is unauthenticated. See https://probot.github.io/docs/github-api/#unauthenticated-events",
      },
    });
  }

  return getAuthenticatedOctokit(state, event.payload.installation.id);
}

// Some events can't get an authenticated client (#382):
function isUnauthenticatedEvent(event: WebhookEvent) {
  return (
    !event.payload.installation ||
    (event.name === "installation" && event.payload.action === "deleted")
  );
}
