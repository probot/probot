import express from "express";
import Redis from "ioredis";
import LRUCache from "lru-cache";

import type { Webhooks } from "@octokit/webhooks";
import type { Logger } from "pino";

import { ApplicationFunction } from ".";
import { Context } from "./context";
import { getAuthenticatedOctokit } from "./octokit/get-authenticated-octokit";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { getLog } from "./helpers/get-log";
import { getOctokitThrottleOptions } from "./octokit/get-octokit-throttle-options";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults";
import { DeprecatedLogger, ProbotWebhooks, State } from "./types";
import { webhookEventCheck } from "./helpers/webhook-event-check";
import { aliasLog } from "./helpers/alias-log";
import { getWebhooks } from "./octokit/get-webhooks";

export interface Options {
  // same options as Probot class
  privateKey?: string;
  githubToken?: string;
  id?: number;
  Octokit?: typeof ProbotOctokit;
  log?: Logger;
  redisConfig?: Redis.RedisOptions;
  secret?: string;
  webhookPath?: string;

  // Application class specific options
  cache?: LRUCache<number, string>;
  octokit?: InstanceType<typeof ProbotOctokit>;
  throttleOptions?: any;
  webhooks?: Webhooks;
  port?: number;
  bindAddress?: string;
}

export type OnCallback<T> = (context: Context<T>) => Promise<void>;

/**
 * The `app` parameter available to `ApplicationFunction`s
 *
 * @property {logger} log - A logger
 */
export class Application {
  public router: express.Router;
  public log: DeprecatedLogger;
  public on: ProbotWebhooks["on"];
  public receive: ProbotWebhooks["receive"];

  private webhooks: ProbotWebhooks;
  private state: State;

  constructor(options: Options) {
    this.log = aliasLog(options.log || getLog());

    // TODO: support redis backend for access token cache if `options.redisConfig || process.env.REDIS_URL`
    const cache =
      options.cache ||
      new LRUCache<number, string>({
        // cache max. 15000 tokens, that will use less than 10mb memory
        max: 15000,
        // Cache for 1 minute less than GitHub expiry
        maxAge: Number(process.env.INSTALLATION_TOKEN_TTL) || 1000 * 60 * 59,
      });

    const Octokit = getProbotOctokitWithDefaults({
      githubToken: options.githubToken,
      Octokit: options.Octokit || ProbotOctokit,
      appId: options.id,
      privateKey: options.privateKey,
      cache,
    });

    this.state = {
      cache,
      githubToken: options.githubToken,
      log: this.log,
      Octokit,
      octokit: options.octokit || new Octokit(),
      throttleOptions:
        options.throttleOptions ||
        getOctokitThrottleOptions({
          log: this.log,
          throttleOptions: options.throttleOptions,
          redisConfig: options.redisConfig,
        }),
      webhooks: {
        path: options.webhookPath,
        secret: options.secret,
      },
      port: options.port || 3000,
      bindAddress: options.bindAddress || "0.0.0.0"
    };

    this.router = express.Router();

    this.webhooks = options.webhooks || getWebhooks(this.state);

    this.on = (eventNameOrNames, callback) => {
      // when an app subscribes to an event using `app.on(event, callback)`, Probot sends a request to `GET /app` and
      // verifies if the app is subscribed to the event and logs a warning if it is not.
      //
      // This feature will be moved out of Probot core as it has side effects and does not work in a stateless environment.
      webhookEventCheck(this.state, eventNameOrNames);

      return this.webhooks.on(eventNameOrNames, callback);
    };
    this.receive = this.webhooks.receive;
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
   */
  public async auth(
    installationId?: number,
    log?: Logger
  ): Promise<InstanceType<typeof ProbotOctokit>> {
    return getAuthenticatedOctokit(
      Object.assign({}, this.state, log ? { log } : null),
      installationId
    );
  }
}
