import type { ProbotOctokit } from "./probot-octokit.js";
import type { OctokitOptions } from "../types.js";
import type { LogFn, Level, Logger } from "pino";

type FactoryOptions = {
  octokit: ProbotOctokit;
  octokitOptions: OctokitOptions;
  [key: string]: unknown;
};

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
 *  export default (app) => {
 *    app.on('issues.opened', async context => {
 *      const octokit = await app.auth();
 *    });
 *  };
 * ```
 * @param {object} options - Options for the authenticated client, including the
 * `octokit` instance and a logger.
 * @param {ProbotOctokit} options.octokit - The Octokit instance to use for authentication.
 * @param {Logger} options.log - A logger instance, typically created with `getLog()`.
 * @param {number} [options.installationId] - ID of the installation, which can be extracted from
 * `context.payload.installation.id`. If called without this parameter, the
 * client wil authenticate [as the app](https://docs.github.com/en/developers/apps/authenticating-with-github-apps#authenticating-as-a-github-app)
 * instead of as a specific installation, which means it can only be used for
 * [app APIs](https://docs.github.com/apps/).
 *
 * @returns An authenticated GitHub API client
 */
export async function getAuthenticatedOctokit(options: {
  octokit: ProbotOctokit;
  log: Logger;
  installationId?: number | undefined;
}): Promise<ProbotOctokit> {
  const { octokit, log, installationId } = options;

  if (!installationId) return octokit;

  return octokit.auth({
    type: "installation",
    installationId,
    factory: ({ octokit, octokitOptions, ...otherOptions }: FactoryOptions) => {
      const options: ConstructorParameters<typeof ProbotOctokit>[0] & {
        log: Record<Level, LogFn>;
      } = {
        ...octokitOptions,
        log: log.child({ name: "github" }),
        throttle: octokitOptions.throttle?.enabled
          ? {
              ...octokitOptions.throttle,
              id: String(installationId),
            }
          : { enabled: false },
        auth: {
          ...octokitOptions.auth,
          otherOptions,
          installationId,
        },
      };

      const Octokit = octokit.constructor as typeof ProbotOctokit;

      return new Octokit(options);
    },
  }) as Promise<ProbotOctokit>;
}
