import express from "express";
import type {
  EmitterWebhookEvent as WebhookEvent,
  Webhooks,
} from "@octokit/webhooks";
import { type LRUCache } from "lru-cache";
import Redis from "ioredis";
import type { Options as LoggingOptions } from "pino-http";

import { Probot } from "./index";
import { Context } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";

import type { Logger, LogFn } from "pino";
import type { RequestRequestOptions } from "@octokit/types";

export interface Options {
  privateKey?: string;
  githubToken?: string;
  appId?: number | string;

  Octokit?: typeof ProbotOctokit;
  log?: Logger;
  redisConfig?: Redis.RedisOptions | string;
  secret?: string;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  logMessageKey?: string;
  port?: number;
  host?: string;
  baseUrl?: string;
  request?: RequestRequestOptions;
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
  request?: RequestRequestOptions;
};

type SimplifiedObject = Omit<Context, keyof WebhookEvent>;
export type ProbotWebhooks = Webhooks<SimplifiedObject>;

export type DeprecatedLogger = LogFn & Logger;

export type ApplicationFunctionOptions = {
  getRouter?: (path?: string) => express.Router;
  [key: string]: unknown;
};
export type ApplicationFunction = (
  app: Probot,
  options: ApplicationFunctionOptions
) => void;

export type ServerOptions = {
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
