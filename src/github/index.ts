import Octokit from '@octokit/rest'
import { addGraphQL } from './graphql'
import { addLogging, Logger } from './logging'
import { addPagination } from './pagination'
import { addRateLimiting } from './rate-limiting'

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @see {@link https://github.com/octokit/rest.js}
 */
export function GitHubAPI (options: Options = {} as any) {
  const octokit = new Octokit(options) as GitHubAPI

  addPagination(octokit)
  addRateLimiting(octokit, options.limiter)
  addLogging(octokit, options.logger)
  addGraphQL(octokit)

  return octokit
}

export interface Options extends Octokit.Options {
  debug?: boolean
  logger: Logger
  limiter?: any
}

export interface RequestOptions {
  baseUrl?: string
  method?: string
  url?: string
  headers?: any
  query?: string
  variables?: Variables
  data?: any
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

interface Paginate extends Octokit.Paginate {
  (
    responsePromise: Promise<Octokit.AnyResponse>,
    callback?: (response: Octokit.AnyResponse) => any
  ): Promise<any[]>
}

type Graphql = (query: string, variables?: Variables, headers?: Headers) => Promise<GraphQlQueryResponse>

export interface GitHubAPI extends Octokit {
  paginate: Paginate
  graphql: Graphql
  /**
   * .query() is deprecated, use .gaphql() instead
   */
  query: Graphql
}

export interface GraphQlQueryResponse {
  data: { [ key: string ]: any } | null
  errors?: [{
    message: string
    path: [string]
    extensions: { [ key: string ]: any }
    locations: [{
      line: number,
      column: number
    }]
  }]
}

export interface Headers {
  [key: string]: string
}

export interface Variables { [key: string]: any }

export { GraphQLError } from './graphql'
