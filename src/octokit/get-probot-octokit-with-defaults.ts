import type { LRUCache } from "lru-cache";
import { ProbotOctokit } from "./probot-octokit.js";
import type { RedisOptions } from "ioredis";
import { request } from "@octokit/request";

import { getOctokitThrottleOptions } from "./get-octokit-throttle-options.js";

import type { Logger } from "pino";
import type { RequestRequestOptions } from "@octokit/types";
import type { OctokitOptions } from "../types.js";

type Options = {
  cache: LRUCache<number, string>;
  Octokit: typeof ProbotOctokit;
  log: Logger;
  githubToken?: string;
  appId?: number;
  privateKey?: string;
  redisConfig?: RedisOptions | string;
  webhookPath?: string;
  baseUrl?: string;
  request?: RequestRequestOptions;
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
        request: request.defaults({
          request: {
            fetch: options.request?.fetch,
          },
        }),
      }
    : {
        cache: options.cache,
        appId: options.appId,
        privateKey: options.privateKey,
        request: request.defaults({
          request: {
            fetch: options.request?.fetch,
          },
        }),
      };

  const octokitThrottleOptions = getOctokitThrottleOptions({
    log: options.log,
    redisConfig: options.redisConfig,
  });

  let defaultOptions: Partial<OctokitOptions> = {
    auth: authOptions,
    log: options.log.child
      ? options.log.child({ name: "octokit" })
      : options.log,
  };

  if (options.baseUrl) {
    defaultOptions.baseUrl = options.baseUrl;
  }

  if (octokitThrottleOptions) {
    defaultOptions.throttle = octokitThrottleOptions;
  }

  return options.Octokit.defaults((instanceOptions: OctokitOptions) => {
    const options = Object.assign({}, defaultOptions, instanceOptions, {
      auth: instanceOptions.auth
        ? Object.assign({}, defaultOptions.auth, instanceOptions.auth)
        : defaultOptions.auth,
    });

    if (instanceOptions.throttle) {
      options.throttle = Object.assign(
        {},
        defaultOptions.throttle,
        instanceOptions.throttle,
      );
    }

    return options;
  });
}
