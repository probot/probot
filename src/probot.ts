import {
  createNodeMiddleware,
  type EmitterWebhookEvent as WebhookEvent,
} from "@octokit/webhooks";
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
  Server,
} from "./server/server.js";
import { rebindLog } from "./helpers/rebind-log.js";
import type { RequestRequestOptions } from "@octokit/types";
import type { RedisOptions } from "ioredis";

export type Constructor<T = any> = new (...args: any[]) => T;

const UNINITIALIZED = 0b000;
const INITIALIZED = 0b001;
const INITIALIZING = 0b010;
const ERRORED = 0b101;

type InitializationState =
  | typeof UNINITIALIZED
  | typeof INITIALIZING
  | typeof INITIALIZED
  | typeof ERRORED;

export type State = {
  initializationState: InitializationState;
  initializedPromise: DeferredPromise<void>;
  cache: Lru<string> | null;
  octokit: ProbotOctokit | null;
  webhooks: ProbotWebhooks | null;
  log: Logger;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  logMessageKey?: string;
  appId?: number;
  privateKey?: string;
  githubToken?: string;
  OctokitBase: typeof ProbotOctokit;
  port?: number;
  host?: string;
  baseUrl?: string;
  redisConfig?: RedisOptions | string;
  webhookPath: string;
  webhookSecret: string;
  request?: RequestRequestOptions;
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
      cache: null,
      octokit: null,
      webhooks: null,
      log: options.log!,
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

      this.#state.log = rebindLog(
        this.#state.log ||
          getLog({
            level: this.#state.logLevel,
            logMessageKey: this.#state.logMessageKey,
          }),
      );

      const Octokit = getProbotOctokitWithDefaults({
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
      this.#state.initializedPromise.resolve();
    } catch (error) {
      this.#state.log.error({ err: error }, "Failed to initialize Probot");
      this.#state.initializationState = ERRORED;
      this.#state.initializedPromise.reject(error);
    } finally {
      return this.#state.initializedPromise.promise;
    }
  }

  public async getNodeMiddleware({
    log,
    path,
  }: { log?: Logger; path?: string } = {}): Promise<
    ReturnType<typeof createNodeMiddleware>
  > {
    await this.#initialize();

    return createNodeMiddleware(this.#state.webhooks!, {
      log: log || this.#state.log,
      path: path || this.#state.webhookPath,
    });
  }

  public async auth(installationId?: number): Promise<ProbotOctokit> {
    await this.#initialize();

    return await getAuthenticatedOctokit({
      log: this.#state.log,
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

  get log() {
    return this.#state.log;
  }

  public on: ProbotWebhooks["on"] = (eventName, callback) => {
    this.#state.webhooks!.on(eventName, callback);
  };

  public onAny: ProbotWebhooks["onAny"] = (callback) => {
    this.#state.webhooks!.onAny(callback);
  };

  public onError: ProbotWebhooks["onError"] = (callback) => {
    this.#state.webhooks!.onError(callback);
  };

  public async ready(): Promise<this> {
    await this.#state.initializedPromise.promise;
    return this;
  }

  public async receive(event: WebhookEvent): Promise<void> {
    await this.#state.initializedPromise.promise;

    this.#state.log.debug({ event }, "Webhook received");
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
