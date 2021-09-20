import { Octokit } from "@octokit/core";
import { enterpriseCompatibility } from "@octokit/plugin-enterprise-compatibility";
import { RequestOptions } from "@octokit/types";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { legacyRestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import { config } from "@probot/octokit-plugin-config";
import { createProbotAuth } from "octokit-auth-probot";

import { probotRequestLogging } from "./octokit-plugin-probot-request-logging";
import { VERSION } from "../version";

const defaultOptions = {
  authStrategy: createProbotAuth,
  throttle: {
    onAbuseLimit: (
      retryAfter: number,
      options: RequestOptions,
      octokit: Octokit
    ) => {
      octokit.log.warn(
        `Abuse limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`
      );
      return true;
    },
    onRateLimit: (
      retryAfter: number,
      options: RequestOptions,
      octokit: Octokit
    ) => {
      octokit.log.warn(
        `Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`
      );
      return true;
    },
  },
  userAgent: `probot/${VERSION}`,
};

export const ProbotOctokit = Octokit.plugin(
  throttling,
  retry,
  paginateRest,
  legacyRestEndpointMethods,
  enterpriseCompatibility,
  probotRequestLogging,
  config
).defaults((instanceOptions: any) => {
  // merge throttle options deeply
  const options = Object.assign({}, defaultOptions, instanceOptions, {
    throttle: instanceOptions.throttle
      ? Object.assign({}, defaultOptions.throttle, instanceOptions.throttle)
      : defaultOptions.throttle,
  });

  return options;
});
