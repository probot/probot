import { createAppAuth } from "@octokit/auth-app";
import LRUCache from "lru-cache";
import { ProbotOctokit } from "./github/octokit";

type Options = {
  cache: LRUCache<number, string>;
  Octokit: typeof ProbotOctokit;
  githubToken?: string;
  appId?: number;
  privateKey?: string;
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
    ? { auth: options.githubToken }
    : {
        auth: {
          cache: options.cache,
          id: options.appId,
          privateKey: options.privateKey,
        },
        authStrategy: createAppAuth,
      };
  const defaultOptions = {
    baseUrl:
      process.env.GHE_HOST &&
      `${process.env.GHE_PROTOCOL || "https"}://${process.env.GHE_HOST}/api/v3`,
    ...authOptions,
  };

  return options.Octokit.defaults((instanceOptions: any) => {
    const options = Object.assign({}, defaultOptions, instanceOptions, {
      auth: instanceOptions.auth
        ? Object.assign({}, defaultOptions.auth, instanceOptions.auth)
        : defaultOptions.auth,
    });

    return options;
  });
}
