import type { RequestRequestOptions } from "@octokit/types";
import {
  createNodeMiddleware,
  validateEventName,
  type EmitterWebhookEvent as WebhookEvent,
} from "@octokit/webhooks";
import type { RedisOptions } from "ioredis";
import type { Logger } from "pino";
import { Lru } from "toad-cache";

import {
  createDeferredPromise,
  type DeferredPromise,
} from "./helpers/create-deferred-promise.js";
import { getAuthenticatedOctokit } from "./octokit/get-authenticated-octokit.js";
import { getLog } from "./helpers/get-log.js";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults.js";
import { getWebhooks } from "./octokit/get-webhooks.js";
import { ProbotOctokit } from "./octokit/probot-octokit.js";
import { VERSION } from "./version.js";
import type {
  ApplicationFunction,
  ApplicationFunctionOptions,
  Options,
  ProbotWebhooks,
} from "./types.js";
import {
  defaultWebhookPath,
  defaultWebhookSecret,
  type Server,
} from "./server/server.js";

export type Constructor<T = any> = new (...args: any[]) => T;

const UNINITIALIZED = 0b00;
const INITIALIZING = 0b01;
const INITIALIZED = 0b10;

type InitializationState =
  | typeof UNINITIALIZED
  | typeof INITIALIZING
  | typeof INITIALIZED;

type OnHandler = ["on", any, any];
type OnAnyHandler = ["onAny", any];
type OnErrorHandler = ["onError", any];

export type State = {
  initializationState: InitializationState;
  initializedPromise: DeferredPromise<void>;
  initEventListeners: (OnHandler | OnAnyHandler | OnErrorHandler)[];
  cache: Lru<string> | null;
  octokit: ProbotOctokit | null;
  webhooks: ProbotWebhooks | null;
  log: Logger | null;
  logFormat?: "pretty" | "json";
  logLevelInString?: boolean;
  sentryDsn?: string | undefined;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  logMessageKey?: string | undefined;
  appId?: number | undefined;
  privateKey?: string | undefined;
  githubToken?: string | undefined;
  OctokitBase: typeof ProbotOctokit;
  port?: number | undefined;
  host?: string | undefined;
  baseUrl?: string | undefined;
  redisConfig?: RedisOptions | string | undefined;
  webhookPath: string;
  webhookSecret: string;
  request?: RequestRequestOptions | undefined;
  server?: Server | void;
};

export class Probot {
  static defaults<S extends Constructor>(
    this: S,
    defaults: Options,
  ): {
    new (...args: any[]): {
      [x: string]: any;
    };
  } & S {
    const ProbotWithDefaults = class extends this {
      constructor(...args: any[]) {
        const options = args[0] || {};
        super(Object.assign({}, defaults, options));
      }
    };

    return ProbotWithDefaults;
  }

  #state: State;

  constructor(options: Options = {}) {
    if (!options.githubToken) {
      if (!options.appId) {
        throw new Error("appId option is required");
      }

      if (!options.privateKey) {
        throw new Error("privateKey option is required");
      }
    }

    this.#state = {
      initializationState: UNINITIALIZED,
      initializedPromise: createDeferredPromise<void>(),
      initEventListeners: [],
      cache: null,
      octokit: null,
      webhooks: null,
      log: options.log || null,
      logFormat: options.logFormat || "pretty",
      logLevelInString: options.logLevelInString || false,
      logLevel: options.logLevel || "warn",
      logMessageKey: options.logMessageKey,
      sentryDsn: options.sentryDsn,
      githubToken: options.githubToken,
      appId: Number.parseInt(options.appId as string, 10),
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      OctokitBase: options.Octokit || ProbotOctokit,
      baseUrl: options.baseUrl,
      redisConfig: options.redisConfig,
      webhookPath: options.webhookPath || defaultWebhookPath,
      webhookSecret: options.secret || defaultWebhookSecret,
      request: options.request,
      server: options.server,
    };

    this.#initialize().catch(() => {});
  }

  async #initialize(): Promise<void> {
    if (this.#state.initializationState !== UNINITIALIZED) {
      return this.#state.initializedPromise.promise;
    }

    this.#state.initializationState = INITIALIZING;

    try {
      // TODO: support redis backend for access token cache if `options.redisConfig`
      this.#state.cache = new Lru<string>(
        // cache max. 15000 tokens, that will use less than 10mb memory
        15000,
        // Cache for 1 minute less than GitHub expiry
        1000 * 60 * 59,
      );

      this.#state.log =
        this.#state.log ||
        (await getLog({
          logFormat: this.#state.logFormat,
          logLevelInString: this.#state.logLevelInString,
          level: this.#state.logLevel,
          logMessageKey: this.#state.logMessageKey,
          sentryDsn: this.#state.sentryDsn,
        }));

      this.#state.log = this.#state.log.child({ name: "probot" });

      const Octokit = await getProbotOctokitWithDefaults({
        githubToken: this.#state.githubToken,
        Octokit: this.#state.OctokitBase,
        appId: this.#state.appId,
        privateKey: this.#state.privateKey,
        cache: this.#state.cache,
        log: this.#state.log,
        redisConfig: this.#state.redisConfig,
        baseUrl: this.#state.baseUrl,
        request: this.#state.request,
      });
      this.#state.octokit = new Octokit();
      this.#state.webhooks = getWebhooks({
        log: this.#state.log,
        octokit: this.#state.octokit,
        webhookSecret: this.#state.webhookSecret,
      });

      this.#state.initializationState = INITIALIZED;

      for (const [type, listener, name] of this.#state.initEventListeners) {
        switch (type) {
          case "on":
            this.#state.webhooks.on(name, listener);
            break;
          case "onAny":
            this.#state.webhooks.onAny(listener);
            break;
          case "onError":
            this.#state.webhooks.onError(listener);
            break;
        }
      }

      this.#state.initEventListeners.length = 0;

      this.#state.initializedPromise.resolve();
    } catch (error) {
      (this.#state.log || console).error(
        { err: error },
        "Failed to initialize Probot",
      );
      this.#state.initializedPromise.reject(error);
    } finally {
      return this.#state.initializedPromise.promise;
    }
  }

  public async getNodeMiddleware({
    log,
    path,
  }: { log?: Logger | undefined; path?: string | undefined } = {}): Promise<
    ReturnType<typeof createNodeMiddleware>
  > {
    await this.#initialize();

    return createNodeMiddleware(this.#state.webhooks!, {
      log: log || this.#state.log!,
      path: path || this.#state.webhookPath,
    });
  }

  public async auth(
    installationId?: number | undefined,
  ): Promise<ProbotOctokit> {
    await this.#initialize();

    return await getAuthenticatedOctokit({
      log: this.#state.log!,
      octokit: this.#state.octokit!,
      installationId,
    });
  }

  public async load(
    appFn: ApplicationFunction | ApplicationFunction[],
    options: ApplicationFunctionOptions = {
      cwd: process.cwd(),
    } as ApplicationFunctionOptions,
  ): Promise<void> {
    await this.#state.initializedPromise.promise;

    if (typeof options.addHandler !== "function") {
      options.addHandler = this.#state.server
        ? this.#state.server.addHandler.bind(this.#state.server)
        : () => {
            throw new Error("No server instance");
          };
    }

    if (Array.isArray(appFn)) {
      for (const fn of appFn) {
        await this.load(fn, options);
      }
      return;
    }

    await appFn(this, options);
    return;
  }

  get log(): Logger {
    return this.#state.log!;
  }

  public on: ProbotWebhooks["on"] = (eventName, callback) => {
    if (Array.isArray(eventName)) {
      for (const name of eventName) {
        validateEventName(name, {
          onUnknownEventName: "ignore",
        });
      }
    } else {
      validateEventName(eventName, {
        onUnknownEventName: "ignore",
      });
    }

    if (this.#state.initializationState !== INITIALIZED) {
      this.#state.initEventListeners.push(["on", callback, eventName]);
      return;
    }

    this.#state.webhooks!.on(eventName, callback);
  };

  public onAny: ProbotWebhooks["onAny"] = (callback) => {
    if (this.#state.initializationState !== INITIALIZED) {
      this.#state.initEventListeners.push(["onAny", callback]);
      return;
    }
    this.#state.webhooks!.onAny(callback);
  };

  public onError: ProbotWebhooks["onError"] = (callback) => {
    if (this.#state.initializationState !== INITIALIZED) {
      this.#state.initEventListeners.push(["onError", callback]);
      return;
    }
    this.#state.webhooks!.onError(callback);
  };

  public async ready(): Promise<this> {
    await this.#state.initializedPromise.promise;
    return this;
  }

  public async receive(event: WebhookEvent): Promise<void> {
    await this.#state.initializedPromise.promise;

    this.#state.log!.debug({ event }, "Webhook received");
    await this.#state.webhooks!.receive(event);
    return;
  }

  static get version(): string {
    return VERSION;
  }

  get version(): string {
    return VERSION;
  }

  get webhooks(): ProbotWebhooks {
    return this.#state.webhooks!;
  }

  get webhookPath(): string {
    return this.#state.webhookPath;
  }
}
