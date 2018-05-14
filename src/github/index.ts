import * as Octokit from '@octokit/rest'
import { addLogging, Logger  } from './logging'
import { addPagination } from './pagination'
import { addRateLimiting } from './rate-limiting'

import { addGraphQL } from './graphql'

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/octokit/rest.js}
 */
export const EnhancedGitHubClient = (options: Options = {} as any) => {
  const octokit = new Octokit(options) as OctokitWithPagination

  addRateLimiting(octokit, options.limiter)
  addLogging(octokit, options.logger)
  addPagination(octokit)
  addGraphQL(octokit)

  return octokit
}

export interface Options extends Octokit.Options {
  debug: boolean
  logger: Logger
  limiter?: any
}

export interface OctokitRequestOptions {
  method: string
  url: string
  headers: any
  query?: string
  variables?: Variables
}

export interface OctokitResult {
  meta: {
    status: string
  }
}

export interface OctokitError {
  code: number
  status: string
}

export interface OctokitWithPagination extends Octokit {
  paginate: (res: Promise<Octokit.AnyResponse>, callback: (results: Octokit.AnyResponse) => void) => Promise<any[]>
  // The following are added because Octokit does not expose the hook.error, hook.before, and hook.after methods
  hook: {
    error: (when: 'request', callback: (error: OctokitError, options: OctokitRequestOptions) => void) => void
    before: (when: 'request', callback: (result: OctokitResult, options: OctokitRequestOptions) => void) => void
    after: (when: 'request', callback: (result: OctokitResult, options: OctokitRequestOptions) => void) => void
  }
  request: (OctokitRequestOptions) => Promise<Octokit.AnyResponse>
  query: (str: string, Variables?: Variables) => Promise<Octokit.AnyResponse>
}

export interface Headers {
  [key: string]: string
}

export interface Variables { [key: string]: any }
