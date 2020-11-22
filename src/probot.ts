import { Server } from "http";

import { Deprecation } from "deprecation";
import express from "express";
import LRUCache from "lru-cache";
import { Logger } from "pino";
import { WebhookEvent, Webhooks } from "@octokit/webhooks";
import { LogLevel, Options as PinoOptions } from "@probot/pino";

import { aliasLog } from "./helpers/alias-log";
import { auth } from "./auth";
import { createServer } from "./server/create-server";
import { createWebhookProxy } from "./helpers/webhook-proxy";
import { getErrorHandler } from "./helpers/get-error-handler";
import { getLog } from "./helpers/get-log";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults";
import { getRouter } from "./get-router";
import { getWebhooks } from "./octokit/get-webhooks";
import { load } from "./load";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { run } from "./run";
import { VERSION } from "./version";
import { webhookEventCheck } from "./helpers/webhook-event-check";
import {
  ApplicationFunction,
  DeprecatedLogger,
  Options,
  ProbotWebhooks,
  State,
} from "./types";
import { defaultApp } from "./apps/default";

const defaultAppFns: ApplicationFunction[] = [defaultApp];

export class Probot {
  public static async run(appFn: ApplicationFunction | string[]) {
    const log = getLog({
      level: process.env.LOG_LEVEL as LogLevel,
      logFormat: process.env.LOG_FORMAT as PinoOptions["logFormat"],
      logLevelInString: process.env.LOG_LEVEL_IN_STRING === "true",
      sentryDsn: process.env.SENTRY_DSN,
    });
    log.warn(
      new Deprecation(
        '[probot] "Probot.run" is deprecate. Import { run } from "probot" instead'
      )
    );
    return run(appFn);
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

  // These need to be public for the tests to work.
  public throttleOptions: any;

  private httpServer?: Server;
  private state: State;

  constructor(options: Options) {
    //
    // Probot class-specific options (Express server & Webhooks)
    //
    options.webhookPath = options.webhookPath || "/";
    options.secret = options.secret || "development";

    let logEnvVariableDeprecation;
    let level = options.logLevel;
    if (!options.log && !level && process.env.LOG_LEVEL) {
      logEnvVariableDeprecation =
        '[probot] "LOG_LEVEL" environment variable is deprecated. Use "new Probot({ logLevel })" instead';
      level = process.env.LOG_LEVEL as Options["logLevel"];
    }

    this.log = aliasLog(options.log || getLog({ level }));

    if (logEnvVariableDeprecation) {
      this.log.warn(new Deprecation(logEnvVariableDeprecation));
    }

    if (options.cert) {
      this.log.warn(
        new Deprecation(
          `[probot] "cert" option is deprecated. Use "privateKey" instead`
        )
      );
      options.privateKey = options.cert;
    }

    if (process.env.INSTALLATION_TOKEN_TTL) {
      this.log.warn(
        '[probot] "INSTALLATION_TOKEN_TTL" environment variable is no longer used. Tokens are renewed as needed at the time of the request now.'
      );
    }

    // TODO: support redis backend for access token cache if `options.redisConfig || process.env.REDIS_URL`
    const cache = new LRUCache<number, string>({
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
      id: options.id,
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      webhookProxy: options.webhookProxy,
    };

    this.auth = auth.bind(null, this.state);

    this.webhooks = getWebhooks(this.state);

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

    this.server = createServer({
      webhook: (this.webhooks as any).middleware,
      logger: this.log,
    });

    this.version = VERSION;

    // TODO: remove once Application class was removed
    this.internalRouter = express.Router();
  }

  /**
   * @deprecated `probot.webhook` is deprecated. Use `probot.webhooks` instead
   */
  public get webhook(): Webhooks {
    this.log.warn(
      new Deprecation(
        `[probot] "probot.webhook" is deprecated. Use "probot.webhooks" instead`
      )
    );

    return this.webhooks;
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

  public setup(appFns: Array<string | ApplicationFunction>) {
    // Log all unhandled rejections
    process.on("unhandledRejection", getErrorHandler(this.log));

    // Load the given appFns along with the default ones
    appFns.concat(defaultAppFns).forEach((appFn) => this.load(appFn));
  }

  public start() {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`
    );
    const port = this.state.port || 3000;
    const { host, webhookProxy } = this.state;
    const webhookPath = this.state.webhooks.path;
    const printableHost = host ?? "localhost";

    this.httpServer = this.server
      .listen(port, ...((host ? [host] : []) as any), () => {
        if (webhookProxy) {
          createWebhookProxy({
            logger: this.log,
            path: webhookPath,
            port: port,
            url: webhookProxy,
          });
        }
        this.log.info(`Listening on http://${printableHost}:${port}`);
      })
      .on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          this.log.error(
            `Port ${port} is already in use. You can define the PORT environment variable to use a different port.`
          );
        } else {
          this.log.error(error);
        }

        process.exit(1);
      });

    return this.httpServer;
  }

  public stop() {
    if (!this.httpServer) return;

    this.httpServer.close();
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

  /**
   * @deprecated this.internalRouter can be removed once we remove the Application class
   */
  private internalRouter: express.Router;

  /**
   * @deprecated use probot.log instead
   */
  public get logger() {
    this.log.warn(
      new Deprecation(
        `[probot] "probot.logger" is deprecated. Use "probot.log" instead`
      )
    );
    return this.log;
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
}
