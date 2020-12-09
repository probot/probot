import { Server } from "http";

import { Deprecation } from "deprecation";
import express from "express";
import LRUCache from "lru-cache";
import { Logger } from "pino";
import { WebhookEvent } from "@octokit/webhooks";
import { LogLevel, Options as PinoOptions } from "@probot/pino";

import { aliasLog } from "./helpers/alias-log";
import { auth } from "./auth";
import { createServer } from "./server/create-server";
import { createWebhookProxy } from "./helpers/webhook-proxy";
import { getErrorHandler } from "./helpers/get-error-handler";
import { getLog } from "./helpers/get-log";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults";
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
export type Constructor<T> = new (...args: any[]) => T;

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

  private httpServer?: Server;
  private state: State;

  constructor(options: Options = {}) {
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
  }

  public receive(event: WebhookEvent) {
    this.log.debug({ event }, "Webhook received");
    return this.webhooks.receive(event);
  }

  public load(appFn: string | ApplicationFunction | ApplicationFunction[]) {
    if (typeof appFn === "string") {
      this.log.warn(
        new Deprecation(
          `[probot] passing a string to "probot.load()" is deprecated. Pass the function from "${appFn}" instead.`
        )
      );
    }

    const router = express.Router();

    // Connect the router from the app to the server
    this.server.use(router);

    // Initialize the ApplicationFunction
    load(this, router, appFn);

    return this;
  }

  public setup(appFns: Array<string | ApplicationFunction>) {
    this.log.warn(
      new Deprecation(
        `[probot] "probot.setup()" is deprecated. Use the new "Server" class instead:
    
    const { Server, Probot } = require("probot")
    const server = new Server({
      // optional:
      host,
      port,
      webhookPath,
      webhookProxy,
      Probot: Probot.defaults({ id, privateKey, ... })
    })

    // load probot app function
    await server.load(({ app }) => {})

    // start listening to requests
    await server.start()
    // stop server with: await server.stop()

If you have more than one app function, combine them in a function instead

    const app1 = require("./app1")
    const app2 = require("./app2")

    module.exports = function app ({ probot, getRouter }) {
      await app1({ probot, getRouter })
      await app2({ probot, getRouter })
    }
`
      )
    );

    // Log all unhandled rejections
    process.on("unhandledRejection", getErrorHandler(this.log));

    // Load the given appFns along with the default ones
    appFns.concat(defaultAppFns).forEach((appFn) => this.load(appFn));
  }

  public start() {
    this.log.warn(
      new Deprecation(
        `[probot] "probot.start()" is deprecated. Use the new "Server" class instead:
    
    const { Server, Probot } = require("probot")
    const server = new Server({ 
      // optional:
      host,
      port,
      webhookPath,
      webhookProxy,
      Probot: Probot.defaults({ id, privateKey, ... })
    })

    // load probot app function
    await server.load(({ app }) => {})

    // start listening to requests
    await server.start()
    // stop server with: await server.stop()
`
      )
    );
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
}
