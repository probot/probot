import express from "express";
import type {
  EmitterWebhookEvent as WebhookEvent,
  Webhooks,
} from "@octokit/webhooks";
import type { LRUCache } from "lru-cache";
import type { RedisOptions } from "ioredis";
import type { Options as LoggingOptions } from "pino-http";

import { Probot } from "./index.js";
import { Context } from "./context.js";
import { ProbotOctokit } from "./octokit/probot-octokit.js";

import type { Logger } from "pino";
import type { RequestRequestOptions } from "@octokit/types";

export interface Options {
  privateKey?: string;
  githubToken?: string;
  appId?: number | string;

  Octokit?: typeof ProbotOctokit;
  log?: Logger;
  redisConfig?: RedisOptions | string;
  secret?: string;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  logMessageKey?: string;
  port?: number;
  host?: string;
  baseUrl?: string;
  request?: RequestRequestOptions;
  webhookPath?: string;
}

export type State = {
  appId?: number;
  privateKey?: string;
  githubToken?: string;
  log: Logger;
  Octokit: typeof ProbotOctokit;
  octokit: ProbotOctokit;
  cache?: LRUCache<number, string>;
  webhooks: {
    secret?: string;
  };
  port?: number;
  host?: string;
  baseUrl?: string;
  webhookPath: string;
  request?: RequestRequestOptions;
};

// Omit the `payload`, `id`,`name` properties from the `Context` class as they are already present in the types of `WebhookEvent`
// The `Webhooks` class accepts a type parameter (`TTransformed`) that is used to transform the event payload in the form of
// WebhookEvent["payload"] & T
// Simply passing `Context` as `TTransformed` would result in the payload types being too complex for TypeScript to infer
// See https://github.com/probot/probot/issues/1388
// See https://github.com/probot/probot/issues/1815 as for why this is in a seperate type, and not directly passed to `Webhooks`
type SimplifiedObject = Omit<Context, keyof WebhookEvent>;
export type ProbotWebhooks = Webhooks<SimplifiedObject>;

export type ApplicationFunctionOptions = {
  getRouter?: (path?: string) => express.Router;
  cwd?: string;
  [key: string]: unknown;
};
export type ApplicationFunction = (
  app: Probot,
  options: ApplicationFunctionOptions,
) => void | Promise<void>;

export type ServerOptions = {
  cwd?: string;
  log?: Logger;
  port?: number;
  host?: string;
  webhookPath?: string;
  webhookProxy?: string;
  Probot: typeof Probot;
  loggingOptions?: LoggingOptions;
  request?: RequestRequestOptions;
};

export type MiddlewareOptions = {
  probot: Probot;
  webhooksPath?: string;
  [key: string]: unknown;
};

export type OctokitOptions = NonNullable<
  ConstructorParameters<typeof ProbotOctokit>[0]
>;

export type PackageJson = {
  name?: string;
  version?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  engines?: {
    [key: string]: string;
  };
};

export type Env = Record<Uppercase<string>, string>;

type ManifestPermissionValue = "read" | "write" | "none";
type ManifestPermissionScope =
  | "actions"
  | "checks"
  | "contents"
  | "deployments"
  | "id-token"
  | "issues"
  | "discussions"
  | "packages"
  | "pages"
  | "pull-requests"
  | "repository-projects"
  | "security-events"
  | "statuses";

export type Manifest = {
  /**
   * The name of the GitHub App.
   */
  name?: string;
  /**
   * __Required.__ The homepage of your GitHub App.
   */
  url: string;
  /**
   * The configuration of the GitHub App's webhook.
   */
  hook_attributes?: {
    /*
     * __Required.__ The URL of the server that will receive the webhook POST requests.
     */
    url: string;
    /*
     * Deliver event details when this hook is triggered, defaults to true.
     */
    active?: boolean;
  };
  /**
   * The full URL to redirect to after a user initiates the registration of a GitHub App from a manifest.
   */
  redirect_url?: string;
  /**
   * A full URL to redirect to after someone authorizes an installation. You can provide up to 10 callback URLs.
   */
  callback_urls?: string[];
  /**
   * A full URL to redirect users to after they install your GitHub App if additional setup is required.
   */
  setup_url?: string;
  /**
   * A description of the GitHub App.
   */
  description?: string;
  /**
   * Set to `true` when your GitHub App is available to the public or `false` when it is only accessible to the owner of the app.
   */
  public?: boolean;
  /**
   * The list of events the GitHub App subscribes to.
   */
  default_events?: WebhookEvent[];
  /**
   * The set of permissions needed by the GitHub App. The format of the object uses the permission name for the key (for example, `issues`) and the access type for the value (for example, `write`).
   */
  default_permissions?:
    | "read-all"
    | "write-all"
    | Record<ManifestPermissionScope, ManifestPermissionValue>;
  /**
   * Set to `true` to request the user to authorize the GitHub App, after the GitHub App is installed.
   */
  request_oauth_on_install?: boolean;
  /**
   * Set to `true` to redirect users to the setup_url after they update your GitHub App installation.
   */
  setup_on_update?: boolean;
};
