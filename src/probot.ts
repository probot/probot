import express from "express";
import LRUCache from "lru-cache";
import { Logger } from "pino";
import { WebhookEvent } from "@octokit/webhooks";

import { aliasLog } from "./helpers/alias-log";
import { auth } from "./auth";
import { createServer } from "./server/create-server";
import { getLog } from "./helpers/get-log";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults";
import { getWebhooks } from "./octokit/get-webhooks";
import { load } from "./load";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { VERSION } from "./version";
import {
  ApplicationFunction,
  DeprecatedLogger,
  Options,
  ProbotWebhooks,
  State,
} from "./types";

export type Constructor<T> = new (...args: any[]) => T;

export class Probot {
  static version = VERSION;
  static defaults<S extends Constructor<any>>(this: S, defaults: Options) {
    const ProbotWithDefaults = class extends this {
      constructor(...args: any[]) {
        const options = args[0] || {};
        super(Object.assign({}, defaults, options));
      }
    };

    return ProbotWithDefaults;
  }

  public server: express.Application;
  public webhooks: ProbotWebhooks;
  public log: DeprecatedLogger;
  public version: String;
  public on: ProbotWebhooks["on"];
  public auth: (
    installationId?: number,
    log?: Logger
  ) => Promise<InstanceType<typeof ProbotOctokit>>;

  private state: State;

  constructor(options: Options = {}) {
    options.webhookPath = options.webhookPath || "/";
    options.secret = options.secret || "development";

    let level = options.logLevel;

    this.log = aliasLog(options.log || getLog({ level }));

    // TODO: support redis backend for access token cache if `options.redisConfig`
    const cache = new LRUCache<number, string>({
      // cache max. 15000 tokens, that will use less than 10mb memory
      max: 15000,
      // Cache for 1 minute less than GitHub expiry
      maxAge: 1000 * 60 * 59,
    });

    const Octokit = getProbotOctokitWithDefaults({
      githubToken: options.githubToken,
      Octokit: options.Octokit || ProbotOctokit,
      appId: Number(options.appId),
      privateKey: options.privateKey,
      cache,
      log: this.log,
      redisConfig: options.redisConfig,
      baseUrl: options.baseUrl,
    });
    const octokit = new Octokit();

    this.state = {
      cache,
      githubToken: options.githubToken,
      log: this.log,
      Octokit,
      octokit,
      webhooks: {
        path: options.webhookPath,
        secret: options.secret,
      },
      appId: Number(options.appId),
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      webhookProxy: options.webhookProxy,
    };

    this.auth = auth.bind(null, this.state);

    this.webhooks = getWebhooks(this.state);

    this.on = (eventNameOrNames, callback) => {
      if (eventNameOrNames === "*") {
        // @ts-ignore this.webhooks.on("*") is deprecated
        return this.webhooks.onAny(callback);
      }

      return this.webhooks.on(eventNameOrNames, callback);
    };

    this.server = createServer({
      webhook: (this.webhooks as any).middleware,
      logger: this.log,
    });

    this.version = VERSION;
  }

  public receive(event: WebhookEvent) {
    this.log.debug({ event }, "Webhook received");
    return this.webhooks.receive(event);
  }

  public load(appFn: string | ApplicationFunction | ApplicationFunction[]) {
    const router = express.Router();

    // Connect the router from the app to the server
    this.server.use(router);

    // Initialize the ApplicationFunction
    load(this, router, appFn);

    return this;
  }
}
