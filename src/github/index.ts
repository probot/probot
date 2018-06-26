import Octokit from '@octokit/rest'
import {addGraphQL} from './graphql'
import {addLogging, Logger} from './logging'
import {addPagination} from './pagination'
import {addRateLimiting} from './rate-limiting'

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @see {@link https://github.com/octokit/rest.js}
 */
export function GitHubAPI(options: Options = {} as any) {
  const octokit = new Octokit(options) as GitHubAPI

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

export interface RequestOptions {
  method: string
  url: string
  headers: any
  query?: string
  variables?: Variables
}

export interface Result {
  headers: {
    status: string
  }
}

export interface OctokitError extends Error {
  code: number
  status: string
}

export interface GitHubAPI extends Octokit {
  paginate: (res: Promise<Octokit.AnyResponse>, callback: (results: Octokit.AnyResponse) => void) => Promise<any[]>
  // The following are added because Octokit does not expose the hook.error, hook.before, and hook.after methods
  hook: {
    error: (when: 'request', callback: (error: OctokitError, options: RequestOptions) => void) => void
    before: (when: 'request', callback: (result: Result, options: RequestOptions) => void) => void
    after: (when: 'request', callback: (result: Result, options: RequestOptions) => void) => void
  }

  request: (RequestOptions: RequestOptions) => Promise<Octokit.AnyResponse>
  query: (query: string, variables?: Variables, headers?: Headers) => Promise<Octokit.AnyResponse>
}

export interface Headers {
  [key: string]: string
}

export interface Variables { [key: string]: any }
