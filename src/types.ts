import { Webhooks } from "@octokit/webhooks";
import LRUCache from "lru-cache";

import { Context } from "./context";
import { LoggerWithTarget } from "./wrap-logger";
import { ProbotOctokit } from "./github/octokit";

export type State = {
  githubToken?: string;
  log: LoggerWithTarget;
  Octokit: typeof ProbotOctokit;
  octokit: InstanceType<typeof ProbotOctokit>;
  throttleOptions: any;
  cache?: LRUCache<number, string>;
};

export type ProbotWebhooks = Webhooks<Context>;
