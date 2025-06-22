import { Lru } from "toad-cache";
import type { Logger } from "pino";
import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";

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
  State,
} from "./types.js";
import { defaultWebhookPath, defaultWebhookSecret } from "./server/server.js";
import { rebindLog } from "./helpers/rebind-log.js";

export type Constructor<T = any> = new (...args: any[]) => T;

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

  public log: Logger;

  #state: State;

  constructor(options: Options = {}) {
    options.secret = options.secret || "development";

    const level = options.logLevel;
    const logMessageKey = options.logMessageKey;

    this.log = options.log
      ? rebindLog(options.log)
      : getLog({ level, logMessageKey });

    // TODO: support redis backend for access token cache if `options.redisConfig`
    const cache = new Lru<string>(
      // cache max. 15000 tokens, that will use less than 10mb memory
      15000,
      // Cache for 1 minute less than GitHub expiry
      1000 * 60 * 59,
    );

    const Octokit = getProbotOctokitWithDefaults({
      githubToken: options.githubToken,
      Octokit: options.Octokit || ProbotOctokit,
      appId: Number(options.appId),
      privateKey: options.privateKey,
      cache,
      log: rebindLog(this.log),
      redisConfig: options.redisConfig,
      baseUrl: options.baseUrl,
      request: options.request,
    });
    const octokitLogger = rebindLog(this.log.child({ name: "octokit" }));
    const octokit = new Octokit({
      request: options.request,
      log: octokitLogger,
    });

    this.#state = {
      cache,
      githubToken: options.githubToken,
      log: rebindLog(this.log),
      Octokit,
      octokit,
      appId: Number(options.appId),
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      webhookPath: options.webhookPath || defaultWebhookPath,
      webhookSecret: options.secret || defaultWebhookSecret,
      request: options.request,
      server: options.server,
    };

    this.#state.webhooks = getWebhooks({
      log: this.#state.log,
      octokit: this.#state.octokit,
      webhookSecret: this.#state.webhookSecret,
    });
  }

  public async auth(installationId?: number): Promise<ProbotOctokit> {
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

  get webhooks(): ProbotWebhooks {
    return this.#state.webhooks!;
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

  public receive(event: WebhookEvent): Promise<void> {
    this.log.debug({ event }, "Webhook received");
    return this.#state.webhooks!.receive(event);
  }

  static get version(): string {
    return VERSION;
  }

  get version(): string {
    return VERSION;
  }

  get webhookPath(): string {
    return this.#state.webhookPath;
  }
}
