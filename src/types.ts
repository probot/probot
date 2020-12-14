import express from "express";
import { WebhookEvent, Webhooks } from "@octokit/webhooks";
import LRUCache from "lru-cache";
import Redis from "ioredis";

import { Probot } from "./index";
import { Context } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";

import type { Logger, LogFn } from "pino";

export interface Options {
  // same options as Application class
  privateKey?: string;
  githubToken?: string;
  appId?: number | string;

  Octokit?: typeof ProbotOctokit;
  log?: Logger;
  redisConfig?: Redis.RedisOptions | string;
  secret?: string;
  webhookPath?: string;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  port?: number;
  host?: string;
  webhookProxy?: string;
  baseUrl?: string;

  // Probot class-specific options
  /**
   * @deprecated `id` options is deprecated. Use `appId` instead
   */
  id?: number | string;
  /**
   * @deprecated `cert` options is deprecated. Use `privateKey` instead
   */
  cert?: string;
  /**
   * @deprecated set `Octokit` to `ProbotOctokit.defaults({ throttle })` instead
   */
  throttleOptions?: any;
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
    path?: string;
    secret?: string;
  };
  port?: number;
  host?: string;
  webhookProxy?: string;
  baseUrl?: string;
};

export type ProbotWebhooks = Webhooks<
  WebhookEvent,
  Omit<Context, keyof WebhookEvent>
>;

export type DeprecatedLogger = LogFn & Logger;

export type GetRouter = (path?: string) => express.Router;
export type ApplicationFunctionOptions = Probot & {
  /**
   * @deprecated "({ app }) => {}" is deprecated (sorry!). We reverted back to the previous API "(app) => {}", see reasoning at https://github.com/probot/probot/issues/1286#issuecomment-744094299
   */
  app: Probot;
  /**
   * @deprecated "({ app, getRouter }) => {}" is deprecated. Use "(app, { getRouter }) => {}" instead
   */
  getRouter: GetRouter;
};
export type ApplicationFunction = (options: ApplicationFunctionOptions) => void;

export type ServerOptions = {
  log?: Logger;
  port?: number;
  host?: string;
  webhookPath?: string;
  webhookProxy?: string;
  Probot: typeof Probot;
};

export type MiddlewareOptions = {
  probot: Probot;
  [key: string]: unknown;

  /**
   * @deprecated "Probot" option is deprecated. Pass a "probot" instance instead, see https://github.com/probot/probot/pull/1431
   */
  Probot?: typeof Probot;
};
