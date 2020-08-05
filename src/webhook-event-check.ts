import { Endpoints } from "@octokit/types";
import { State } from "./types";

type AppsGetAuthenticatedResponse = Endpoints["GET /app"]["response"]["data"];

let appMeta: Promise<AppsGetAuthenticatedResponse> | null = null;
let didFailRetrievingAppMeta = false;

/**
 * Check if an application is subscribed to an event.
 *
 * @returns Returns `false` if the app is not subscribed to an event. Otherwise,
 * returns `true`. Returns `undefined` if the webhook-event-check feature is
 * disabled or if Probot failed to retrieve the GitHub App's metadata.
 */
export async function webhookEventCheck(
  state: State,
  eventNameOrNames: string | string[]
) {
  if (isWebhookEventCheckEnabled() === false) {
    return;
  }

  const eventNames = Array.isArray(eventNameOrNames)
    ? eventNameOrNames
    : [eventNameOrNames];

  const uniqueBaseEventNames = [
    ...new Set(eventNames.map((name) => name.split(".")[0])),
  ];

  let subscribedCount = 0;
  for (const baseEventName of uniqueBaseEventNames) {
    if (await isSubscribedToEvent(state, baseEventName)) {
      subscribedCount++;
    } else if (didFailRetrievingAppMeta === false) {
      const subscribedTo = JSON.stringify(eventNameOrNames);
      const humanName = baseEventName.split(/_/).join(" ");
      state.log.error(
        `Your app is attempting to listen to ${subscribedTo}, but your GitHub App is not subscribed to the "${humanName}" event.`
      );
    }
  }

  if (subscribedCount === uniqueBaseEventNames.length) {
    return true;
  }

  return didFailRetrievingAppMeta ? undefined : false;
}

/**
 * @param {string} baseEventName The base event name refers to the part before
 * the first period mark (e.g. the `issues` part in `issues.opened`).
 * @returns Returns `false` when the application is not subscribed to a webhook
 * event. Otherwise, returns `true`. Returns `undefined` if Probot failed to
 * retrieve GitHub App metadata.
 *
 * **Note**: Probot will only check against a list of events known to be in the
 * `GET /app` response. Therefore, only the `false` value should be considered
 * truthy.
 */
async function isSubscribedToEvent(state: State, baseEventName: string) {
  // A list of events known to be in the response of `GET /app`. This list can
  // be retrieved by calling `GET /app` from an authenticated app that has
  // maximum permissions and is subscribed to all available webhook events.
  const knownBaseEvents = [
    "check_run",
    "check_suite",
    "commit_comment",
    "content_reference",
    "create",
    "delete",
    "deployment",
    "deployment_status",
    "deploy_key",
    "fork",
    "gollum",
    "issues",
    "issue_comment",
    "label",
    "member",
    "membership",
    "milestone",
    "organization",
    "org_block",
    "page_build",
    "project",
    "project_card",
    "project_column",
    "public",
    "pull_request",
    "pull_request_review",
    "pull_request_review_comment",
    "push",
    "release",
    "repository",
    "repository_dispatch",
    "star",
    "status",
    "team",
    "team_add",
    "watch",
  ];

  // Because `GET /app` does not include all events - such as default events
  // that all GitHub Apps are subscribed to (e.g.`installation`, `meta`, or
  // `marketplace_purchase`) - we can only check `baseEventName` if it is known
  // to be in the `GET /app` response.
  const eventMayExistInAppResponse = knownBaseEvents.includes(baseEventName);

  if (!eventMayExistInAppResponse) {
    return true;
  }

  let events;
  try {
    events = (await retrieveAppMeta(state)).events;
  } catch (e) {
    if (!didFailRetrievingAppMeta) {
      state.log.warn(e);
    }
    didFailRetrievingAppMeta = true;
    return;
  }

  return events.includes(baseEventName);
}

async function retrieveAppMeta(state: State) {
  if (appMeta) return appMeta;

  appMeta = new Promise(async (resolve, reject) => {
    try {
      const { data } = await state.octokit.apps.getAuthenticated();

      return resolve(data);
    } catch (e) {
      state.log.trace(e);
      /**
       * There are a few reasons why Probot might be unable to retrieve
       * application metadata.
       *
       * - Probot may not be connected to the Internet.
       * - The GitHub API is not responding to requests (see
       *   https://www.githubstatus.com/).
       * - The user has incorrectly configured environment variables (e.g.
       *   APP_ID, PRIVATE_KEY, etc.) used for authentication between the Probot
       *   app and the GitHub API.
       */
      return reject(
        [
          "Probot is unable to retrieve app information from GitHub for event subscription verification.",
          "",
          "If this error persists, feel free to raise an issue at:",
          "  - https://github.com/probot/probot/issues",
        ].join("\n")
      );
    }
  });

  return appMeta;
}

function isWebhookEventCheckEnabled() {
  if (process.env.DISABLE_WEBHOOK_EVENT_CHECK?.toLowerCase() === "true") {
    return false;
  } else if (process.env.NODE_ENV?.toLowerCase() === "production") {
    return false;
  } else if (inTestEnvironment()) {
    // We disable the feature in test environments to avoid requiring developers
    // to add a stub mocking the `GET /app` route this feature calls.
    return false;
  }
  return true;
}

/**
 * Detects if Probot is likely running in a test environment.
 *
 * **Note**: This method only detects Jest environments or when NODE_ENV starts
 * with `test`.
 * @returns Returns `true` if Probot is in a test environment.
 */
function inTestEnvironment(): boolean {
  const nodeEnvContainsTest =
    process.env.NODE_ENV?.substr(0, 4).toLowerCase() === "test";
  const isRunningJest = process.env.JEST_WORKER_ID !== undefined;
  return nodeEnvContainsTest || isRunningJest;
}
