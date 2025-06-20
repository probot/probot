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
import { getLog } from "./helpers/get-log.js";
import { getProbotOctokitWithDefaults } from "./octokit/get-probot-octokit-with-defaults.js";
import { getAuthenticatedOctokit } from "./octokit/get-authenticated-octokit.js";
import { getWebhooks } from "./octokit/get-webhooks.js";
import { ProbotOctokit } from "./octokit/probot-octokit.js";
import { VERSION } from "./version.js";
import type {
  ApplicationFunction,
  ApplicationFunctionOptions,
  Options,
  ProbotWebhooks,
  State,
} from "./types.js";
import { defaultWebhooksPath } from "./server/server.js";
import { rebindLog } from "./helpers/rebind-log.js";

export type Constructor<T = any> = new (...args: any[]) => T;

export class Probot {
  static version = VERSION;
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

  #initialized: DeferredPromise<void> = createDeferredPromise<void>();

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
      initialized: false,
      cache: null,
      octokit: null,
      webhooks: null,
      log: options.log!,
      githubToken: options.githubToken,
      webhooksSecret: options.secret || "development",
      appId: Number.parseInt(options.appId as string, 10),
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      OctokitBase: options.Octokit || ProbotOctokit,
      baseUrl: options.baseUrl,
      redisConfig: options.redisConfig,
      webhookPath: options.webhookPath || defaultWebhooksPath,
      request: options.request,
      server: options.server,
    };

    this.initialize().catch(() => {});
  }

  public async initialize(): Promise<void> {
    if (this.#state.initialized === true) {
      return this.#initialized.promise;
    }
    if (this.#state.initialized instanceof Error) {
      return Promise.reject(this.#state.initialized);
    }
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
        webhooksSecret: this.#state.webhooksSecret,
      });

      this.#initialized.resolve();

      this.#state.initialized = true;
    } catch (error) {
      this.#state.log.error({ err: error }, "Failed to initialize Probot");
      this.#state.initialized = error as Error;
      this.#initialized.reject(error);
      return this.#initialized.promise;
    } finally {
      return this.#initialized.promise;
    }
  }

  get log() {
    return this.#state.log;
  }

  get version(): string {
    return VERSION;
  }

  get webhookPath(): string {
    return this.#state.webhookPath;
  }

  public async getNodeMiddleware({
    log,
    path,
  }: { log?: Logger; path?: string } = {}): Promise<
    ReturnType<typeof createNodeMiddleware>
  > {
    await this.initialize();

    return createNodeMiddleware(this.#state.webhooks!, {
      log: log || this.#state.log,
      path: path || this.#state.webhookPath,
    });
  }

  public async auth(installationId?: number): Promise<ProbotOctokit> {
    await this.initialize();

    return getAuthenticatedOctokit({
      log: this.#state.log,
      octokit: this.#state.octokit!,
      installationId,
    });
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

  public async receive(event: WebhookEvent): Promise<void> {
    this.#state.log.debug({ event }, "Webhook received");
    await this.#state.webhooks!.receive(event);
    return;
  }

  public async load(
    appFn: ApplicationFunction | ApplicationFunction[],
    options: ApplicationFunctionOptions = {
      cwd: process.cwd(),
    } as ApplicationFunctionOptions,
  ): Promise<void> {
    await this.#initialized.promise;

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
}
