import { request } from "@octokit/request";
import type { RequestRequestOptions } from "@octokit/types";
import type { RedisOptions } from "ioredis";
import type { Logger } from "pino";
import type { Lru } from "toad-cache";

import type { OctokitOptions } from "../types.js";
import { ProbotOctokit } from "./probot-octokit.js";
import { getOctokitThrottleOptions } from "./get-octokit-throttle-options.js";

type Options = {
  cache: Lru<string>;
  Octokit: typeof ProbotOctokit;
  log: Logger;
  githubToken?: string | undefined;
  appId?: number | undefined;
  privateKey?: string | undefined;
  redisConfig?: RedisOptions | string | undefined;
  baseUrl?: string | undefined;
  request?: RequestRequestOptions | undefined;
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
export async function getProbotOctokitWithDefaults(
  options: Options,
): Promise<typeof ProbotOctokit> {
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

  const log = options.log.child({ name: "octokit" });

  const octokitThrottleOptions = await getOctokitThrottleOptions({
    log,
    redisConfig: options.redisConfig,
  });

  const defaultOptions: Partial<OctokitOptions> = {
    log,
    auth: authOptions,
  };

  if (options.request) {
    defaultOptions.request = options.request;
  }

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
