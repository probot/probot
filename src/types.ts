import {
  EmitterWebhookEvent as WebhookEvent,
  Webhooks,
} from "@octokit/webhooks";
import express from "express";
import Redis from "ioredis";
import LRUCache from "lru-cache";

import type { LogFn, Logger } from "pino";
import { Options as LoggingOptions } from "pino-http";
import { Context } from "./context.js";

import { Probot } from "./index.js";
import { ProbotOctokit } from "./octokit/probot-octokit.js";

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
};

export type ProbotWebhooks = Webhooks<Omit<Context, keyof WebhookEvent>>;

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
};

export type MiddlewareOptions = {
  probot: Probot;
  webhooksPath?: string;
  [key: string]: unknown;
};
