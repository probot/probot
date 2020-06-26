import { Octokit as OctokitRest } from '@octokit/rest'

import { logger } from '../logger'
import { Logger } from './logging'
import { ProbotOctokit } from './octokit'

type OctokitOptions = ConstructorParameters<typeof OctokitRest>[0]

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @see {@link https://github.com/octokit/rest.js}
 */
export function GitHubAPI (options: Options = { logger, Octokit: ProbotOctokit }) {
  const { Octokit, ...octokitOptions } = options

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

  const octokit = new Octokit(finalOptsChangeVarName)

  return octokit
}

// TODO: Is there a way we can gather the options from Octokit/rest for
// `OctokitOptions` and not have to refer to the lower core module Octokit/core?
export type Options = OctokitOptions & {
  logger: Logger,
  Octokit: typeof ProbotOctokit
}
