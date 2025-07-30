import { Octokit } from "@octokit/core";
import { enterpriseCompatibility } from "@octokit/plugin-enterprise-compatibility";
import type { RequestOptions } from "@octokit/types";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import { config } from "@probot/octokit-plugin-config";
import { createProbotAuth } from "octokit-auth-probot";

import { probotRequestLogging } from "./octokit-plugin-probot-request-logging.js";
import { VERSION } from "../version.js";
import type { Constructor } from "../probot.js";

const defaultOptions = {
  authStrategy: createProbotAuth,
  throttle: {
    enabled: true,
    onSecondaryRateLimit: (
      retryAfter: number,
      options: RequestOptions,
      octokit: Octokit,
    ) => {
      octokit.log.warn(
        `Secondary Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`,
      );
      return true;
    },
    onRateLimit: (
      retryAfter: number,
      options: RequestOptions,
      octokit: Octokit,
    ) => {
      octokit.log.warn(
        `Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`,
      );
      return true;
    },
  },
  userAgent: `probot/${VERSION}`,
};
export const ProbotOctokit: typeof Octokit &
  Constructor<
    ReturnType<typeof retry> &
      ReturnType<typeof paginateRest> &
      ReturnType<typeof restEndpointMethods> &
      ReturnType<typeof config>
  > = Octokit.plugin(
  throttling,
  retry,
  paginateRest,
  restEndpointMethods,
  enterpriseCompatibility,
  probotRequestLogging,
  config,
).defaults((instanceOptions: any) => {
  // merge throttle options deeply
  const options = {
    ...defaultOptions,
    ...instanceOptions,
    ...{
      throttle: { ...defaultOptions.throttle, ...instanceOptions?.throttle },
    },
  };

  return options;
});

export type ProbotOctokit = InstanceType<typeof ProbotOctokit>;
