import { Lru } from "toad-cache";
import type { Logger } from "pino";
import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";

import { auth } from "./auth.js";
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

  public webhooks: ProbotWebhooks;
  public webhookPath: string;
  public log: Logger;
  public version: String;
  public on: ProbotWebhooks["on"];
  public onAny: ProbotWebhooks["onAny"];
  public onError: ProbotWebhooks["onError"];
  public auth: (
    installationId?: number,
    log?: Logger,
  ) => Promise<ProbotOctokit>;

  #state: State;

  constructor(options: Options = {}) {
    options.secret = options.secret || "development";

    let level = options.logLevel;
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
      webhooks: {
        secret: options.secret,
      },
      appId: Number(options.appId),
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      webhookPath: options.webhookPath || defaultWebhooksPath,
      request: options.request,
    };

    this.auth = auth.bind(null, this.#state);

    this.webhooks = getWebhooks(this.#state);
    this.webhookPath = this.#state.webhookPath;

    this.on = this.webhooks.on;
    this.onAny = this.webhooks.onAny;
    this.onError = this.webhooks.onError;

    this.version = VERSION;
  }

  public receive(event: WebhookEvent): Promise<void> {
    this.log.debug({ event }, "Webhook received");
    return this.webhooks.receive(event);
  }

  public async load(
    appFn: ApplicationFunction | ApplicationFunction[],
    options: ApplicationFunctionOptions = {},
  ): Promise<void> {
    if (Array.isArray(appFn)) {
      for (const fn of appFn) {
        await this.load(fn);
      }
      return;
    }

    await appFn(this, options);
    return;
  }
}
