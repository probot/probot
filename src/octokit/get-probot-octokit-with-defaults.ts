import Redis from "ioredis";
import LRUCache from "lru-cache";

import type { Logger } from "pino";
import { aliasLog } from "../helpers/alias-log.js";

import { getOctokitThrottleOptions } from "./get-octokit-throttle-options.js";
import { ProbotOctokit } from "./probot-octokit";

type Options = {
  cache: LRUCache<number, string>;
  Octokit: typeof ProbotOctokit;
  log: Logger;
  githubToken?: string;
  appId?: number;
  privateKey?: string;
  redisConfig?: Redis.RedisOptions | string;
  baseUrl?: string;
};

/**
 * Returns an Octokit instance with default settings for authentication. If
 * a `githubToken` is passed explicitly, the Octokit instance will be
 * pre-authenticated with that token when instantiated. Otherwise Octokit's
 * app authentication strategy is used, and `options.auth` options are merged
 * deeply when instantiated.
 *
 * Besides the authentication, the Octokit's baseUrl is set as well when run
 * against a GitHub Enterprise Server with a custom domain.
 */
export function getProbotOctokitWithDefaults(options: Options) {
  const authOptions = options.githubToken
    ? {
        token: options.githubToken,
      }
    : {
        cache: options.cache,
        appId: options.appId,
        privateKey: options.privateKey,
      };

  const octokitThrottleOptions = getOctokitThrottleOptions({
    log: options.log,
    redisConfig: options.redisConfig,
  });

  let defaultOptions: any = {
    auth: authOptions,
    log: options.log.child
      ? aliasLog(options.log.child({ name: "octokit" }))
      : options.log,
  };

  if (options.baseUrl) {
    defaultOptions.baseUrl = options.baseUrl;
  }

  if (octokitThrottleOptions) {
    defaultOptions.throttle = octokitThrottleOptions;
  }

  return options.Octokit.defaults((instanceOptions: any) => {
    const options = Object.assign({}, defaultOptions, instanceOptions, {
      auth: instanceOptions.auth
        ? Object.assign({}, defaultOptions.auth, instanceOptions.auth)
        : defaultOptions.auth,
    });

    if (instanceOptions.throttle) {
      options.throttle = Object.assign(
        {},
        defaultOptions.throttle,
        instanceOptions.throttle
      );
    }

    return options;
  });
}
