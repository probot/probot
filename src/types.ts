import { Webhooks } from "@octokit/webhooks";
import LRUCache from "lru-cache";

import { Context } from "./context";
import { ProbotOctokit } from "./github/octokit";

import type { Logger } from "pino";

export type State = {
  githubToken?: string;
  log: Logger;
  Octokit: typeof ProbotOctokit;
  octokit: InstanceType<typeof ProbotOctokit>;
  throttleOptions: any;
  cache?: LRUCache<number, string>;
};

export type ProbotWebhooks = Webhooks<Context>;
