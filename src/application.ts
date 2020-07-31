import { EventPayloads, WebhookEvent } from "@octokit/webhooks";
import express from "express";
import LRUCache from "lru-cache";
import { EventEmitter } from "promise-events";

import { ApplicationFunction } from ".";
import { Context } from "./context";
import { ProbotOctokit } from "./github/octokit";
import { logger } from "./logger";
import webhookEventCheck from "./webhook-event-check";
import { LoggerWithTarget, wrapLogger } from "./wrap-logger";

export interface Options {
  cache: LRUCache<number, string>;
  router?: express.Router;
  githubToken?: string;
  throttleOptions?: any;
  Octokit?: typeof ProbotOctokit;
  octokit: InstanceType<typeof ProbotOctokit>;
}

export type OnCallback<T> = (context: Context<T>) => Promise<void>;

// Some events can't get an authenticated client (#382):
function isUnauthenticatedEvent(event: WebhookEvent) {
  return (
    !event.payload.installation ||
    (event.name === "installation" && event.payload.action === "deleted")
  );
}

/**
 * The `app` parameter available to `ApplicationFunction`s
 *
 * @property {logger} log - A logger
 */
export class Application {
  public events: EventEmitter;
  public cache: LRUCache<number, string>;
  public router: express.Router;
  public log: LoggerWithTarget;

  private githubToken?: string;
  private throttleOptions: any;
  private Octokit: typeof ProbotOctokit;
  private octokit: InstanceType<typeof ProbotOctokit>;

  constructor(options?: Options) {
    const opts = options || ({} as any);
    this.events = new EventEmitter();
    this.log = wrapLogger(logger, logger);
    this.cache = opts.cache;
    this.router = opts.router || express.Router(); // you can do this?
    this.githubToken = opts.githubToken;
    this.throttleOptions = opts.throttleOptions;
    this.Octokit = opts.Octokit || ProbotOctokit;
    this.octokit = opts.octokit;
  }

  /**
   * Loads an ApplicationFunction into the current Application
   * @param appFn - Probot application function to load
   */
  public load(appFn: ApplicationFunction | ApplicationFunction[]): Application {
    if (Array.isArray(appFn)) {
      appFn.forEach((a) => this.load(a));
    } else {
      appFn(this);
    }

    return this;
  }

  public async receive(event: WebhookEvent) {
    return Promise.all([
      this.events.emit("*", event),
      this.events.emit(event.name, event),
      this.events.emit(`${event.name}.${event.payload.action}`, event),
    ]);
  }

  /**
   * Get an {@link http://expressjs.com|express} router that can be used to
   * expose HTTP endpoints
   *
   * ```
   * module.exports = app => {
   *   // Get an express router to expose new HTTP endpoints
   *   const route = app.route('/my-app');
   *
   *   // Use any middleware
   *   route.use(require('express').static(__dirname + '/public'));
   *
   *   // Add a new route
   *   route.get('/hello-world', (req, res) => {
   *     res.end('Hello World');
   *   });
   * };
   * ```
   *
   * @param path - the prefix for the routes
   * @returns an [express.Router](http://expressjs.com/en/4x/api.html#router)
   */
  public route(path?: string): express.Router {
    if (path) {
      const router = express.Router();
      this.router.use(path, router);
      return router;
    } else {
      return this.router;
    }
  }

  /**
   * Listen for [GitHub webhooks](https://developer.github.com/webhooks/),
   * which are fired for almost every significant action that users take on
   * GitHub.
   *
   * @param event - the name of the [GitHub webhook
   * event](https://developer.github.com/webhooks/#events). Most events also
   * include an "action". For example, the * [`issues`](
   * https://developer.github.com/v3/activity/events/types/#issuesevent)
   * event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`,
   * `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`.
   * Often, your bot will only care about one type of action, so you can append
   * it to the event name with a `.`, like `issues.closed`.
   *
   * ```js
   * app.on('push', context => {
   *   // Code was just pushed.
   * });
   *
   * app.on('issues.opened', context => {
   *   // An issue was just opened.
   * });
   * ```
   *
   * @param callback - a function to call when the
   * webhook is received.
   */
  public on(
    event:
      | "check_run"
      | "check_run.completed"
      | "check_run.created"
      | "check_run.requested_action"
      | "check_run.rerequested",
    callback: OnCallback<EventPayloads.WebhookPayloadCheckRun>
  ): void;

  public on(
    event:
      | "check_suite"
      | "check_suite.completed"
      | "check_suite.requested"
      | "check_suite.rerequested",
    callback: OnCallback<EventPayloads.WebhookPayloadCheckSuite>
  ): void;

  public on(
    event: "commit_comment" | "commit_comment.created",
    callback: OnCallback<EventPayloads.WebhookPayloadCommitComment>
  ): void;

  public on(
    event: "create",
    callback: OnCallback<EventPayloads.WebhookPayloadCreate>
  ): void;

  public on(
    event: "delete",
    callback: OnCallback<EventPayloads.WebhookPayloadDelete>
  ): void;

  public on(
    event: "deployment",
    callback: OnCallback<EventPayloads.WebhookPayloadDeployment>
  ): void;

  public on(
    event: "deployment_status",
    callback: OnCallback<EventPayloads.WebhookPayloadDeploymentStatus>
  ): void;

  public on(
    event: "fork",
    callback: OnCallback<EventPayloads.WebhookPayloadFork>
  ): void;

  public on(
    event: "github_app_authorization",
    callback: OnCallback<EventPayloads.WebhookPayloadGithubAppAuthorization>
  ): void;

  public on(
    event: "gollum",
    callback: OnCallback<EventPayloads.WebhookPayloadGollum>
  ): void;

  public on(
    event: "installation" | "installation.created" | "installation.deleted",
    callback: OnCallback<EventPayloads.WebhookPayloadInstallation>
  ): void;

  public on(
    event:
      | "installation_repositories"
      | "installation_repositories.added"
      | "installation_repositories.removed",
    callback: OnCallback<EventPayloads.WebhookPayloadInstallationRepositories>
  ): void;

  public on(
    event:
      | "issue_comment"
      | "issue_comment.created"
      | "issue_comment.deleted"
      | "issue_comment.edited",
    callback: OnCallback<EventPayloads.WebhookPayloadIssueComment>
  ): void;

  public on(
    event:
      | "issues"
      | "issues.assigned"
      | "issues.closed"
      | "issues.deleted"
      | "issues.demilestoned"
      | "issues.edited"
      | "issues.labeled"
      | "issues.milestoned"
      | "issues.opened"
      | "issues.reopened"
      | "issues.transferred"
      | "issues.unassigned"
      | "issues.unlabeled",
    callback: OnCallback<EventPayloads.WebhookPayloadIssues>
  ): void;

  public on(
    event: "label" | "label.created" | "label.deleted" | "label.edited",
    callback: OnCallback<EventPayloads.WebhookPayloadLabel>
  ): void;

  public on(
    event:
      | "marketplace_purchase"
      | "marketplace_purchase.cancelled"
      | "marketplace_purchase.changed"
      | "marketplace_purchase.pending_change"
      | "marketplace_purchase.pending_change_cancelled"
      | "marketplace_purchase.purchased",
    callback: OnCallback<EventPayloads.WebhookPayloadMarketplacePurchase>
  ): void;

  public on(
    event: "member" | "member.added" | "member.deleted" | "member.edited",
    callback: OnCallback<EventPayloads.WebhookPayloadMember>
  ): void;

  public on(
    event: "membership" | "membership.added" | "membership.removed",
    callback: OnCallback<EventPayloads.WebhookPayloadMembership>
  ): void;

  public on(
    event:
      | "milestone"
      | "milestone.closed"
      | "milestone.created"
      | "milestone.deleted"
      | "milestone.edited"
      | "milestone.opened",
    callback: OnCallback<EventPayloads.WebhookPayloadMilestone>
  ): void;

  public on(
    event:
      | "organization"
      | "organization.member_added"
      | "organization.member_invited"
      | "organization.member_removed",
    callback: OnCallback<EventPayloads.WebhookPayloadOrganization>
  ): void;

  public on(
    event: "org_block" | "org_block.blocked" | "org_block.unblocked",
    callback: OnCallback<EventPayloads.WebhookPayloadOrgBlock>
  ): void;

  public on(
    event: "page_build",
    callback: OnCallback<EventPayloads.WebhookPayloadPageBuild>
  ): void;

  public on(
    event:
      | "project_card"
      | "project_card.converted"
      | "project_card.created"
      | "project_card.deleted"
      | "project_card.edited"
      | "project_card.moved",
    callback: OnCallback<EventPayloads.WebhookPayloadProjectCard>
  ): void;

  public on(
    event:
      | "project_column"
      | "project_column.created"
      | "project_column.deleted"
      | "project_column.edited"
      | "project_column.moved",
    callback: OnCallback<EventPayloads.WebhookPayloadProjectColumn>
  ): void;

  public on(
    event:
      | "project"
      | "project.closed"
      | "project.created"
      | "project.deleted"
      | "project.edited"
      | "project.reopened",
    callback: OnCallback<EventPayloads.WebhookPayloadProject>
  ): void;

  public on(
    event: "public",
    callback: OnCallback<EventPayloads.WebhookPayloadPublic>
  ): void;

  public on(
    event:
      | "pull_request"
      | "pull_request.assigned"
      | "pull_request.closed"
      | "pull_request.edited"
      | "pull_request.labeled"
      | "pull_request.opened"
      | "pull_request.reopened"
      | "pull_request.review_request_removed"
      | "pull_request.review_requested"
      | "pull_request.unassigned"
      | "pull_request.unlabeled"
      | "pull_request.synchronize",
    callback: OnCallback<EventPayloads.WebhookPayloadPullRequest>
  ): void;

  public on(
    event:
      | "pull_request_review"
      | "pull_request_review.dismissed"
      | "pull_request_review.edited"
      | "pull_request_review.submitted",
    callback: OnCallback<EventPayloads.WebhookPayloadPullRequestReview>
  ): void;

  public on(
    event:
      | "pull_request_review_comment"
      | "pull_request_review_comment.created"
      | "pull_request_review_comment.deleted"
      | "pull_request_review_comment.edited",
    callback: OnCallback<EventPayloads.WebhookPayloadPullRequestReviewComment>
  ): void;

  public on(
    event: "push",
    callback: OnCallback<EventPayloads.WebhookPayloadPush>
  ): void;

  public on(
    event: "release" | "release.published",
    callback: OnCallback<EventPayloads.WebhookPayloadRelease>
  ): void;

  public on(
    event:
      | "repository"
      | "repository.archived"
      | "repository.created"
      | "repository.deleted"
      | "repository.privatized"
      | "repository.publicized"
      | "repository.unarchived",
    callback: OnCallback<EventPayloads.WebhookPayloadRepository>
  ): void;

  public on(
    event: "repository_import",
    callback: OnCallback<EventPayloads.WebhookPayloadRepositoryImport>
  ): void;

  public on(
    event:
      | "repository_vulnerability_alert"
      | "repository_vulnerability_alert.create"
      | "repository_vulnerability_alert.dismiss"
      | "repository_vulnerability_alert.resolve",
    callback: OnCallback<
      EventPayloads.WebhookPayloadRepositoryVulnerabilityAlert
    >
  ): void;

  public on(
    event:
      | "security_advisory"
      | "security_advisory.performed"
      | "security_advisory.published"
      | "security_advisory.updated",
    callback: OnCallback<EventPayloads.WebhookPayloadSecurityAdvisory>
  ): void;

  public on(
    event: "status",
    callback: OnCallback<EventPayloads.WebhookPayloadStatus>
  ): void;

  public on(
    event:
      | "team"
      | "team.added_to_repository"
      | "team.created"
      | "team.deleted"
      | "team.edited"
      | "team.removed_from_repository",
    callback: OnCallback<EventPayloads.WebhookPayloadTeam>
  ): void;

  public on(
    event: "team_add",
    callback: OnCallback<EventPayloads.WebhookPayloadTeamAdd>
  ): void;

  public on(
    event: "watch" | "watch.started",
    callback: OnCallback<EventPayloads.WebhookPayloadWatch>
  ): void;
  public on(eventName: string | string[], callback: OnCallback<any>): void;
  public on(
    eventName: string | string[],
    callback: (context: Context) => Promise<void>
  ) {
    if (typeof eventName === "string") {
      void webhookEventCheck(this, eventName);

      return this.events.on(eventName, async (event: WebhookEvent) => {
        const log = this.log.child({ name: "event", id: event.id });

        try {
          const github = await this.authenticateEvent(event, log);
          const context = new Context(event, github, log);

          await callback(context);
        } catch (err) {
          // avoid the error.code deprecation message
          // can be replaced with `log.error({ err, event, ...err })` once @octokit/request-error v3 is used
          const { name, message, stack, headers, request, status } = err;
          log.error({
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
      });
    } else {
      eventName.forEach((e) => this.on(e, callback));
    }
  }

  /**
   * Authenticate and get a GitHub client that can be used to make API calls.
   *
   * You'll probably want to use `context.github` instead.
   *
   * **Note**: `app.auth` is asynchronous, so it needs to be prefixed with a
   * [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
   * to wait for the magic to happen.
   *
   * ```js
   *  module.exports = (app) => {
   *    app.on('issues.opened', async context => {
   *      const github = await app.auth();
   *    });
   *  };
   * ```
   *
   * @param id - ID of the installation, which can be extracted from
   * `context.payload.installation.id`. If called without this parameter, the
   * client wil authenticate [as the app](https://developer.github.com/apps/building-integrations/setting-up-and-registering-github-apps/about-authentication-options-for-github-apps/#authenticating-as-a-github-app)
   * instead of as a specific installation, which means it can only be used for
   * [app APIs](https://developer.github.com/v3/apps/).
   *
   * @returns An authenticated GitHub API client
   * @private
   */
  public async auth(
    id?: number,
    log = this.log
  ): Promise<InstanceType<typeof ProbotOctokit>> {
    if (!id) return this.octokit;

    const authOptions = this.githubToken
      ? {}
      : { auth: { installationId: id } };
    const throttleOptions = this.throttleOptions
      ? {
          throttle: {
            id,
            ...this.throttleOptions,
          },
        }
      : {};

    const options = {
      log: log.child({ name: "github" }),
      ...authOptions,
      ...throttleOptions,
    };

    return new this.Octokit(options);
  }

  private authenticateEvent(
    event: WebhookEvent,
    log: LoggerWithTarget
  ): Promise<InstanceType<typeof ProbotOctokit>> {
    if (this.githubToken) {
      return this.auth();
    }

    if (isUnauthenticatedEvent(event)) {
      log.debug(
        "`context.github` is unauthenticated. See https://probot.github.io/docs/github-api/#unauthenticated-events"
      );
      return this.auth();
    }

    return this.auth(event.payload.installation.id, log);
  }
}
