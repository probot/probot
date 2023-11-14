import express from "express";
import type {
  EmitterWebhookEvent as WebhookEvent,
  Webhooks,
} from "@octokit/webhooks";
import type { LRUCache } from "lru-cache";
import type { RedisOptions } from "ioredis";
import type { Options as LoggingOptions } from "pino-http";

import { Probot } from "./index";
import { Context } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";

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
  octokit: InstanceType<typeof ProbotOctokit>;
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
