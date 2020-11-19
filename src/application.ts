import { Router } from "express";
import Redis from "ioredis";
import LRUCache from "lru-cache";
import { Deprecation } from "deprecation";

import type { Webhooks } from "@octokit/webhooks";
import type { Logger } from "pino";

import { Context } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { getLog } from "./helpers/get-log";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults";
import {
  DeprecatedLogger,
  ProbotWebhooks,
  State,
  ApplicationFunction,
} from "./types";
import { webhookEventCheck } from "./helpers/webhook-event-check";
import { aliasLog } from "./helpers/alias-log";
import { getWebhooks } from "./octokit/get-webhooks";
import { load } from "./load";
import { getRouter } from "./get-router";
import { auth } from "./auth";

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
  webhooks?: Webhooks;

  /**
   * @deprecated "app.router" is deprecated, use "getRouter()" from the app function instead: "({ app, getRouter }) => { ... }"
   */
  router?: Router;
  /**
   * @deprecated set `Octokit` to `ProbotOctokit.defaults({ throttle })` instead
   */
  throttleOptions?: any;
}

export type OnCallback<T> = (context: Context<T>) => Promise<void>;

/**
 * The `app` parameter available to `ApplicationFunction`s
 *
 * @property {logger} log - A logger
 */
export class Application {
  public log: DeprecatedLogger;
  public on: ProbotWebhooks["on"];
  public receive: ProbotWebhooks["receive"];
  public load: (
    appFn: ApplicationFunction | ApplicationFunction[]
  ) => Application;
  public auth: (
    installationId?: number,
    log?: Logger
  ) => Promise<InstanceType<typeof ProbotOctokit>>;

  private webhooks: ProbotWebhooks;
  private state: State;
  private internalRouter: Router;

  constructor(options: Options) {
    this.log = aliasLog(options.log || getLog(process.env.LOG_LEVEL));

    this.log.warn(
      `[probot] "import { Application } from 'probot'" is deprecated. Use "import { Probot } from 'probot'" instead, the APIs are the same.`
    );

    const cache =
      options.cache ||
      new LRUCache<number, string>({
        // cache max. 15000 tokens, that will use less than 10mb memory
        max: 15000,
        // Cache for 1 minute less than GitHub expiry
        maxAge: 1000 * 60 * 59,
      });

    const Octokit = getProbotOctokitWithDefaults({
      githubToken: options.githubToken,
      Octokit: options.Octokit || ProbotOctokit,
      appId: options.id,
      privateKey: options.privateKey,
      cache,
      log: this.log,
      redisConfig: options.redisConfig,
      throttleOptions: options.throttleOptions,
    });

    if (options.throttleOptions) {
      this.log.warn(
        `[probot] "new Application({ throttleOptions })" is deprecated. Use "new Application({Octokit: ProbotOctokit.defaults({ throttle }) })" instead`
      );
    }

    this.state = {
      cache,
      githubToken: options.githubToken,
      log: this.log,
      Octokit,
      octokit: options.octokit || new Octokit(),
      webhooks: {
        path: options.webhookPath,
        secret: options.secret,
      },
    };

    this.webhooks = options.webhooks || getWebhooks(this.state);

    this.on = (eventNameOrNames, callback) => {
      // when an app subscribes to an event using `app.on(event, callback)`, Probot sends a request to `GET /app` and
      // verifies if the app is subscribed to the event and logs a warning if it is not.
      //
      // This feature will be moved out of Probot core as it has side effects and does not work in a stateless environment.
      webhookEventCheck(this.state, eventNameOrNames);

      if (eventNameOrNames === "*") {
        // @ts-ignore this workaround is only to surpress a warning. The `.on()` method will be deprecated soon anyway.
        return this.webhooks.onAny(callback);
      }

      return this.webhooks.on(eventNameOrNames, callback);
    };
    this.receive = this.webhooks.receive;

    const router = options.router || Router();
    // @ts-ignore
    this.load = load.bind(null, this, router);
    this.auth = auth.bind(null, this.state);

    this.internalRouter = router;
  }

  /**
   * @deprecated "app.router" is deprecated, use "getRouter()" from the app function instead: "({ app, getRouter }) => { ... }"
   */
  public get router() {
    this.log.warn(
      new Deprecation(
        `[probot] "app.router" is deprecated, use "getRouter()" from the app function instead: "({ app, getRouter }) => { ... }"`
      )
    );

    return this.internalRouter;
  }

  /**
   * Get an {@link http://expressjs.com|express} router that can be used to
   * expose HTTP endpoints
   *
   * ```
   * module.exports = ({ app, getRouter }) => {
   *   // Get an express router to expose new HTTP endpoints
   *   const router = getRouter('/my-app');
   *
   *   // Use any middleware
   *   router.use(require('express').static(__dirname + '/public'));
   *
   *   // Add a new route
   *   router.get('/hello-world', (req, res) => {
   *     res.end('Hello World');
   *   });
   * };
   * ```
   *
   * @param path - the prefix for the routes* @param path
   *
   * @deprecated "app.route()" is deprecated, use the "getRouter()" argument from the app function instead: "({ app, getRouter }) => { ... }"
   */
  route(path?: string) {
    this.log.warn(
      new Deprecation(
        `[probot] "app.route()" is deprecated, use the "getRouter()" argument from the app function instead: "({ app, getRouter }) => { ... }"`
      )
    );

    return getRouter(this.internalRouter, path);
  }
}
