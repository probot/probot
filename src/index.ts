// tslint:disable-next-line: no-var-requires
require("dotenv").config();

import { Server } from "http";

import express from "express";
import Redis from "ioredis";
import LRUCache from "lru-cache";
import { Deprecation } from "deprecation";
import pinoHttp from "pino-http";
import { getPrivateKey } from "@probot/get-private-key";

import type { WebhookEvent, Webhooks } from "@octokit/webhooks";
import type { Logger } from "pino";

import { Application } from "./application";
import { setupAppFactory } from "./apps/setup";
import { Context, WebhookPayloadWithRepository } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";
import { getLog } from "./helpers/get-log";
import { resolveAppFunction } from "./helpers/resolve-app-function";
import { createServer } from "./server/create-server";
import { createWebhookProxy } from "./helpers/webhook-proxy";
import { getErrorHandler } from "./helpers/get-error-handler";
import {
  ApplicationFunction,
  DeprecatedLogger,
  ProbotWebhooks,
  State,
} from "./types";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults";
import { aliasLog } from "./helpers/alias-log";
import { logWarningsForObsoleteEnvironmentVariables } from "./helpers/log-warnings-for-obsolete-environment-variables";
import { getWebhooks } from "./octokit/get-webhooks";
import { webhookEventCheck } from "./helpers/webhook-event-check";
import { auth } from "./auth";
import { load } from "./load";
import { getRouter } from "./get-router";

logWarningsForObsoleteEnvironmentVariables();

export interface Options {
  // same options as Application class
  privateKey?: string;
  githubToken?: string;
  id?: number;
  Octokit?: typeof ProbotOctokit;
  log?: Logger;
  redisConfig?: Redis.RedisOptions;
  secret?: string;
  webhookPath?: string;

  // Probot class-specific options
  /**
   * @deprecated `cert` options is deprecated. Use `privateKey` instead
   */
  cert?: string;
  port?: number;
  host?: string;
  webhookProxy?: string;
  /**
   * @deprecated set `Octokit` to `ProbotOctokit.defaults({ throttle })` instead
   */
  throttleOptions?: any;
}

// tslint:disable:no-var-requires
const defaultAppFns: ApplicationFunction[] = [require("./apps/default")];
// tslint:enable:no-var-requires

export class Probot {
  public static async run(appFn: ApplicationFunction | string[]) {
    const pkgConf = require("pkg-conf");
    const program = require("commander");

    const readOptions = (): Options => {
      if (Array.isArray(appFn)) {
        program
          .usage("[options] <apps...>")
          .option(
            "-p, --port <n>",
            "Port to start the server on",
            process.env.PORT || 3000
          )
          .option(
            "-H --host <host>",
            "Host to start the server on",
            process.env.HOST
          )
          .option(
            "-W, --webhook-proxy <url>",
            "URL of the webhook proxy service.`",
            process.env.WEBHOOK_PROXY_URL
          )
          .option(
            "-w, --webhook-path <path>",
            "URL path which receives webhooks. Ex: `/webhook`",
            process.env.WEBHOOK_PATH
          )
          .option("-a, --app <id>", "ID of the GitHub App", process.env.APP_ID)
          .option(
            "-s, --secret <secret>",
            "Webhook secret of the GitHub App",
            process.env.WEBHOOK_SECRET
          )
          .option(
            "-P, --private-key <file>",
            "Path to certificate of the GitHub App",
            process.env.PRIVATE_KEY_PATH
          )
          .parse(appFn);

        return {
          privateKey:
            getPrivateKey({ filepath: program.privateKey }) || undefined,
          id: program.app,
          port: program.port,
          host: program.host,
          secret: program.secret,
          webhookPath: program.webhookPath,
          webhookProxy: program.webhookProxy,
        };
      }
      const privateKey = getPrivateKey();
      return {
        privateKey: (privateKey && privateKey.toString()) || undefined,
        id: Number(process.env.APP_ID),
        port: Number(process.env.PORT) || 3000,
        host: process.env.HOST,
        secret: process.env.WEBHOOK_SECRET,
        webhookPath: process.env.WEBHOOK_PATH,
        webhookProxy: process.env.WEBHOOK_PROXY_URL,
      };
    };

    const options = readOptions();
    const probot = new Probot(options);

    if (!options.id || !options.privateKey) {
      if (process.env.NODE_ENV === "production") {
        if (!options.id) {
          throw new Error(
            "Application ID is missing, and is required to run in production mode. " +
              "To resolve, ensure the APP_ID environment variable is set."
          );
        } else if (!options.privateKey) {
          throw new Error(
            "Certificate is missing, and is required to run in production mode. " +
              "To resolve, ensure either the PRIVATE_KEY or PRIVATE_KEY_PATH environment variable is set and contains a valid certificate"
          );
        }
      }
      probot.load(setupAppFactory(probot.options.host, probot.options.port));
    } else if (Array.isArray(appFn)) {
      const pkg = await pkgConf("probot");
      probot.setup(program.args.concat(pkg.apps || []));
    } else {
      probot.load(appFn);
    }
    probot.start();

    return probot;
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
  public options: Options;
  public throttleOptions: any;

  private httpServer?: Server;
  private state: State;

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

  constructor(options: Options) {
    if (process.env.GHE_HOST && /^https?:\/\//.test(process.env.GHE_HOST)) {
      throw new Error(
        "Your `GHE_HOST` environment variable should not begin with https:// or http://"
      );
    }

    //
    // Probot class-specific options (Express server & Webhooks)
    //
    options.webhookPath = options.webhookPath || "/";
    options.secret = options.secret || "development";

    this.log = aliasLog(options.log || getLog());

    if (options.cert) {
      this.log.warn(
        new Deprecation(
          `[probot] "cert" option is deprecated. Use "privateKey" instead`
        )
      );
      options.privateKey = options.cert;
    }

    // TODO: support redis backend for access token cache if `options.redisConfig || process.env.REDIS_URL`
    const cache = new LRUCache<number, string>({
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
      log: this.log,
      redisConfig: options.redisConfig,
      throttleOptions: options.throttleOptions,
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

    const { version } = require("../package.json");
    this.version = version;

    // TODO: remove once Application class was removed
    this.internalRouter = express.Router();

    // TODO: Refactor tests so we we can remove these
    this.options = options;
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
    if (typeof appFn === "string") {
      appFn = resolveAppFunction(appFn) as ApplicationFunction;
    }

    const router = express.Router();

    // Connect the router from the app to the server
    this.server.use(router);

    // Initialize the ApplicationFunction
    load(this, router, appFn);

    return this;
  }

  public setup(appFns: Array<string | ApplicationFunction>) {
    // Log all unhandled rejections
    (process as NodeJS.EventEmitter).on(
      "unhandledRejection",
      getErrorHandler(this.log)
    );

    // Load the given appFns along with the default ones
    appFns.concat(defaultAppFns).forEach((appFn) => this.load(appFn));

    // Register error handler as the last middleware
    this.server.use(
      pinoHttp({
        logger: this.log,
      })
    );
  }

  public start() {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`
    );
    const port = this.options.port || 3000;
    const { host } = this.options;
    const printableHost = host ?? "localhost";

    this.httpServer = this.server
      .listen(port, ...((host ? [host] : []) as any), () => {
        if (this.options.webhookProxy) {
          createWebhookProxy({
            logger: this.log,
            path: this.options.webhookPath,
            port: this.options.port,
            url: this.options.webhookProxy,
          });
        }
        this.log.info(`Listening on http://${printableHost}:${port}`);
      })
      .on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          this.log.error(
            `Port ${this.options.port} is already in use. You can define the PORT environment variable to use a different port.`
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
}

export const createProbot = (options: Options) => {
  options.log = options.log || getLog();
  options.log.warn(
    new Deprecation(
      `[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead`
    )
  );
  return new Probot(options);
};

export { Logger, Context, Application, ProbotOctokit };

/** NOTE: exported types might change at any point in time */
export { WebhookPayloadWithRepository };
