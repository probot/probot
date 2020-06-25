import { OctokitOptions } from "@octokit/core/dist-types/types"

import { ProbotOctokit } from "./octokit"
import { Logger } from "./logging"
import { logger } from "../logger"

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @see {@link https://github.com/octokit/rest.js}
 */
export function GitHubAPI (options: Options = { logger, Octokit: ProbotOctokit }) {
  const { Octokit, ...octokitOptions} = options

  const finalOptsChangeVarName = Object.assign(octokitOptions, {
    throttle: Object.assign({
      onAbuseLimit: (retryAfter: number) => {
        options.logger.warn(`Abuse limit hit, retrying in ${retryAfter} seconds.`)
        return true
      },
      onRateLimit: (retryAfter: number) => {
        options.logger.warn(`Rate limit hit, retrying in ${retryAfter} seconds.`)
        return true
      }
    }, options.throttle)
  })
  /**
   * TODO: Maxim: The octokit type is missing the `authenticate` and
   * `registerEndpoints` methods that were available in v16. Have these methods
   * been deprecated?
   *
   * Update: `registerEndpoints` has been removed.
   * https://github.com/octokit/rest.js/releases/tag/v17.0.0
   *
   * Status: What about the `authenticate` method? It looks like `auth` has replaced `authenticate`.
   */
  const octokit = new Octokit(finalOptsChangeVarName)

  return octokit
}

// TODO: Is there a way we can gather the options from Octokit/rest for
// `OctokitOptions` and not have to refer to the lower core module Octokit/core?
export interface Options extends OctokitOptions {
  logger: Logger
  Octokit: typeof ProbotOctokit
}

