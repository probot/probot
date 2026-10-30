import { Octokit } from "@octokit/core";
import type { OctokitOptions } from "@octokit/core";
import type { Constructor, ReturnTypeOf } from "@octokit/core/types";
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
export const PROBOT_OCTOKIT_DEFAULTS = Symbol("probot octokit defaults");

type Simplify<T> = { [K in keyof T]: T[K] };

type ProbotOctokitPlugins = Simplify<
  ReturnTypeOf<
    [
      typeof throttling,
      typeof retry,
      typeof paginateRest,
      typeof restEndpointMethods,
      typeof enterpriseCompatibility,
      typeof probotRequestLogging,
      typeof config,
    ]
  >
>;

const ProbotOctokitBase: typeof Octokit & Constructor<ProbotOctokitPlugins> =
  Octokit.plugin(
    throttling,
    retry,
    paginateRest,
    restEndpointMethods,
    enterpriseCompatibility,
    probotRequestLogging,
    config,
  ).defaults((instanceOptions: OctokitOptions) => {
    // merge throttle options deeply
    const options = {
      ...defaultOptions,
      ...instanceOptions,
      ...{
        throttle: { ...defaultOptions.throttle, ...instanceOptions.throttle },
      },
    };

    return options;
  });

const octokitDefaults = Octokit.defaults;
(
  ProbotOctokitBase as typeof ProbotOctokitBase & {
    defaults: typeof Octokit.defaults;
  }
).defaults = function (defaults) {
  const Constructor = octokitDefaults.call(this, defaults);

  if (typeof defaults !== "function") {
    Object.defineProperty(Constructor, PROBOT_OCTOKIT_DEFAULTS, {
      value: {
        ...(
          this as unknown as typeof ProbotOctokitBase & {
            [PROBOT_OCTOKIT_DEFAULTS]?: OctokitOptions;
          }
        )[PROBOT_OCTOKIT_DEFAULTS],
        ...defaults,
      },
    });
  }

  return Constructor;
} as typeof Octokit.defaults;

export const ProbotOctokit = ProbotOctokitBase;

export type ProbotOctokit = InstanceType<typeof ProbotOctokit>;
