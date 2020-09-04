import { Webhooks } from "@octokit/webhooks";
import LRUCache from "lru-cache";

import { Context } from "./context";
import { ProbotOctokit } from "./octokit/probot-octokit";

import type { Logger, LogFn } from "pino";

export type State = {
  id?: number;
  privateKey?: string;
  githubToken?: string;
  log: Logger;
  Octokit: typeof ProbotOctokit;
  octokit: InstanceType<typeof ProbotOctokit>;
  throttleOptions: any;
  cache?: LRUCache<number, string>;
  webhooks: {
    path?: string;
    secret?: string;
  },
  port: number,
  bindAddress: string;
};

export type ProbotWebhooks = Webhooks<Context>;

export type DeprecatedLogger = LogFn & Logger;
