import type { Logger } from "pino";

import { getAuthenticatedOctokit } from "./octokit/get-authenticated-octokit";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { State } from "./types";

/**
 * Authenticate and get a GitHub client that can be used to make API calls.
 *
 * You'll probably want to use `context.octokit` instead.
 *
 * **Note**: `app.auth` is asynchronous, so it needs to be prefixed with a
 * [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
 * to wait for the magic to happen.
 *
 * ```js
 *  module.exports = (app) => {
 *    app.on('issues.opened', async context => {
 *      const octokit = await app.auth();
 *    });
 *  };
 * ```
 *
 * @param id - ID of the installation, which can be extracted from
 * `context.payload.installation.id`. If called without this parameter, the
 * client wil authenticate [as the app](https://docs.github.com/en/developers/apps/authenticating-with-github-apps#authenticating-as-a-github-app)
 * instead of as a specific installation, which means it can only be used for
 * [app APIs](https://docs.github.com/apps/).
 *
 * @returns An authenticated GitHub API client
 */
export async function auth(
  state: State,
  installationId?: number,
  log?: Logger
): Promise<InstanceType<typeof ProbotOctokit>> {
  return getAuthenticatedOctokit(
    Object.assign({}, state, log ? { log } : null),
    installationId
  );
}
