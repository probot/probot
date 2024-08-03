import path from "node:path";
import merge from "deepmerge";

import type {
  EmitterWebhookEvent as WebhookEvent,
  EmitterWebhookEventName as WebhookEvents,
} from "@octokit/webhooks";
import type { Logger } from "pino";
import type { ProbotOctokit } from "./octokit/probot-octokit.js";

export type MergeOptions = merge.Options;

/** Repo owner type, either string or never depending on the context */
type RepoOwnerType<T extends WebhookEvents> =
  WebhookEvent<T>["payload"] extends {
    repository: { owner: { login: string } };
  }
    ? string
    : never;

/** Repo name type, either string or never depending on the context */
type RepoNameType<T extends WebhookEvents> =
  WebhookEvent<T>["payload"] extends { repository: { name: string } }
    ? string
    : never;

/** Issue type (also pull request number), either number or never depending on the context */
type RepoIssueNumberType<T extends WebhookEvents> =
  WebhookEvent<T>["payload"] extends { issue: { number: number } }
    ? number
    : never | WebhookEvent<T>["payload"] extends {
          pull_request: { number: number };
        }
      ? number
      : never | WebhookEvent<T>["payload"] extends { number: number }
        ? number
        : never;

/** Context.repo return type */
type RepoResultType<E extends WebhookEvents> = {
  owner: RepoOwnerType<E>;
  repo: RepoNameType<E>;
};

/**
 * The context of the event that was triggered, including the payload and
 * helpers for extracting information can be passed to GitHub API calls.
 *
 *  ```js
 *  export default app => {
 *    app.on('push', context => {
 *      context.log.info('Code was pushed to the repo, what should we do with it?');
 *    });
 *  };
 *  ```
 *
 * @property {octokit} octokit - An Octokit instance
 * @property {payload} payload - The webhook event payload
 * @property {log} log - A pino instance
 */
export class Context<Event extends WebhookEvents = WebhookEvents> {
  public name: WebhookEvents;
  public id: string;
  public payload: {
    [K in Event]: K extends WebhookEvents ? WebhookEvent<K> : never;
  }[Event]["payload"];

  public octokit: ProbotOctokit;
  public log: Logger;

  constructor(event: WebhookEvent<Event>, octokit: ProbotOctokit, log: Logger) {
    this.name = event.name;
    this.id = event.id;
    this.payload = event.payload;

    this.octokit = octokit;
    this.log = log;

    // set `x-github-delivery` header on all requests sent in response to the current
    // event. This allows GitHub Support to correlate the request with the event.
    // This is not documented and not considered public API, the header may change.
    // Once we document this as best practice on https://docs.github.com/en/rest/guides/best-practices-for-integrators
    // we will make it official
    /* istanbul ignore next */
    octokit.hook.before("request", (options) => {
      options.headers["x-github-delivery"] = event.id;
    });
  }

  /**
   * Return the `owner` and `repo` params for making API requests against a
   * repository.
   *
   * ```js
   * const params = context.repo({path: '.github/config.yml'})
   * // Returns: {owner: 'username', repo: 'reponame', path: '.github/config.yml'}
   * ```
   *
   * @param object - Params to be merged with the repo params.
   *
   */
  public repo<T>(object?: T): RepoResultType<Event> & T {
    // @ts-expect-error `repository` is not always present in this.payload
    const repo = this.payload.repository;

    if (!repo) {
      throw new Error(
        "context.repo() is not supported for this webhook event.",
      );
    }

    return Object.assign(
      {
        owner: repo.owner.login,
        repo: repo.name,
      },
      object,
    );
  }

  /**
   * Return the `owner`, `repo`, and `issue_number` params for making API requests
   * against an issue. The object passed in will be merged with the repo params.
   *
   *
   * ```js
   * const params = context.issue({body: 'Hello World!'})
   * // Returns: {owner: 'username', repo: 'reponame', issue_number: 123, body: 'Hello World!'}
   * ```
   *
   * @param object - Params to be merged with the issue params.
   */
  public issue<T>(
    object?: T,
  ): RepoResultType<Event> & { issue_number: RepoIssueNumberType<Event> } & T {
    return Object.assign(
      {
        issue_number:
          // @ts-expect-error - this.payload may not have `issue` or `pull_request` keys
          (this.payload.issue || this.payload.pull_request || this.payload)
            .number,
      },
      this.repo(object),
    );
  }

  /**
   * Return the `owner`, `repo`, and `pull_number` params for making API requests
   * against a pull request. The object passed in will be merged with the repo params.
   *
   *
   * ```js
   * const params = context.pullRequest({body: 'Hello World!'})
   * // Returns: {owner: 'username', repo: 'reponame', pull_number: 123, body: 'Hello World!'}
   * ```
   *
   * @param object - Params to be merged with the pull request params.
   */
  public pullRequest<T>(
    object?: T,
  ): RepoResultType<Event> & { pull_number: RepoIssueNumberType<Event> } & T {
    const payload = this.payload;
    return Object.assign(
      {
        // @ts-expect-error - this.payload may not have `issue` or `pull_request` keys
        pull_number: (payload.issue || payload.pull_request || payload).number,
      },
      this.repo(object),
    );
  }

  /**
   * Returns a boolean if the actor on the event was a bot.
   * @type {boolean}
   */
  get isBot() {
    // @ts-expect-error - `sender` key is currently not present in all events
    // see https://github.com/octokit/webhooks/issues/510
    return this.payload.sender.type === "Bot";
  }

  /**
   * Reads the app configuration from the given YAML file in the `.github`
   * directory of the repository.
   *
   * For example, given a file named `.github/config.yml`:
   *
   * ```yml
   * close: true
   * comment: Check the specs on the rotary girder.
   * ```
   *
   * Your app can read that file from the target repository:
   *
   * ```js
   * // Load config from .github/config.yml in the repository
   * const config = await context.config('config.yml')
   *
   * if (config.close) {
   *   context.octokit.issues.comment(context.issue({body: config.comment}))
   *   context.octokit.issues.edit(context.issue({state: 'closed'}))
   * }
   * ```
   *
   * You can also use a `defaultConfig` object:
   *
   * ```js
   * // Load config from .github/config.yml in the repository and combine with default config
   * const config = await context.config('config.yml', {comment: 'Make sure to check all the specs.'})
   *
   * if (config.close) {
   *   context.octokit.issues.comment(context.issue({body: config.comment}));
   *   context.octokit.issues.edit(context.issue({state: 'closed'}))
   * }
   * ```
   *
   * Config files can also specify a base that they extend. `deepMergeOptions` can be used
   * to configure how the target config, extended base, and default configs are merged.
   *
   * For security reasons, configuration is only loaded from the repository's default branch,
   * changes made in pull requests from different branches or forks are ignored.
   *
   * If you need more lower-level control over reading and merging configuration files,
   * you can `context.octokit.config.get(options)`, see https://github.com/probot/octokit-plugin-config.
   *
   * @param fileName - Name of the YAML file in the `.github` directory
   * @param defaultConfig - An object of default config options
   * @param deepMergeOptions - Controls merging configs (from the [deepmerge](https://github.com/TehShrike/deepmerge) module)
   * @return Configuration object read from the file
   */
  public async config<T>(
    fileName: string,
    defaultConfig?: T,
    deepMergeOptions?: MergeOptions,
  ): Promise<T | null> {
    const params = this.repo({
      path: path.posix.join(".github", fileName),
      defaults(configs: object[]) {
        const result = merge.all(
          [defaultConfig || {}, ...configs],
          deepMergeOptions,
        );

        return result;
      },
    });

    // @ts-expect-error
    const { config, files } = await this.octokit.config.get(params);

    // if no default config is set, and no config files are found, return null
    if (!defaultConfig && !files.find((file) => file.config !== null)) {
      return null;
    }

    return config as T;
  }
}
