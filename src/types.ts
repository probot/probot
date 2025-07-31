import type { IncomingMessage, ServerResponse } from "node:http";
import type { RequestRequestOptions } from "@octokit/types";
import type {
  EmitterWebhookEvent as WebhookEvent,
  Webhooks,
} from "@octokit/webhooks";
import type { RedisOptions } from "ioredis";
import type { Logger } from "pino";
import type { Options as LoggingOptions } from "pino-http";

import type { Context } from "./context.js";
import type { Probot } from "./probot.js";
import type { Server } from "./server/server.js";
import type { ProbotOctokit } from "./octokit/probot-octokit.js";

export type StripUndefined<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined>;
};

export interface Options {
  privateKey?: string | undefined;
  githubToken?: string | undefined;
  appId?: number | string | undefined;
  Octokit?: typeof ProbotOctokit | undefined;
  log?: Logger | undefined;
  redisConfig?: RedisOptions | string | undefined;
  secret?: string | undefined;
  logLevel?:
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "error"
    | "fatal"
    | undefined;
  logFormat?: "json" | "pretty" | undefined;
  logLevelInString?: boolean | undefined;
  logMessageKey?: string | undefined;
  sentryDsn?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
  server?: Server | undefined;
  baseUrl?: string | undefined;
  request?: RequestRequestOptions | undefined;
  webhookPath?: string | undefined;
  webhookProxy?: string | undefined;
}

// Omit the `payload`, `id`,`name` properties from the `Context` class as they are already present in the types of `WebhookEvent`
// The `Webhooks` class accepts a type parameter (`TTransformed`) that is used to transform the event payload in the form of
// WebhookEvent["payload"] & T
// Simply passing `Context` as `TTransformed` would result in the payload types being too complex for TypeScript to infer
// See https://github.com/probot/probot/issues/1388
// See https://github.com/probot/probot/issues/1815 as for why this is in a seperate type, and not directly passed to `Webhooks`
type SimplifiedObject = Omit<Context, keyof WebhookEvent>;
export type ProbotWebhooks = Webhooks<SimplifiedObject>;

export type ApplicationFunctionOptions = {
  cwd: string;
  addHandler: (handler: Handler) => void;
  [key: string]: unknown;
};

export type HandlerFactory = (
  app: Probot,
  options: ApplicationFunctionOptions,
) => Handler | Promise<Handler>;

export type ApplicationFunction = (
  app: Probot,
  options: ApplicationFunctionOptions,
) => void | Promise<void>;

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | boolean | Promise<void | boolean>;

export type ServerOptions = {
  cwd?: string | undefined;
  log?: Logger | undefined;
  port?: number | undefined;
  host?: string | undefined;
  webhookPath?: string | undefined;
  webhookProxy?: string | undefined;

  enablePing?: boolean | undefined;
  enableNotFound?: boolean | undefined;
  enableStaticFiles?: boolean | undefined;

  Probot: typeof Probot;
  loggingOptions?: LoggingOptions;
  request?: RequestRequestOptions | undefined;
};

export type MiddlewareOptions = {
  probot: Probot;
  webhooksPath?: string | undefined;
  [key: string]: unknown;
};

export type OctokitOptions = NonNullable<
  ConstructorParameters<typeof ProbotOctokit>[0]
>;

export type PackageJson = {
  name?: string | undefined;
  version?: string | undefined;
  description?: string | undefined;
  homepage?: string | undefined;
  repository?: string | undefined;
  engines?:
    | {
        [key: string]: string;
      }
    | undefined;
};

export type Env = NodeJS.ProcessEnv;

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
