import { graphql } from '@octokit/graphql'
import { enterpriseCompatibility } from '@octokit/plugin-enterprise-compatibility'

import { createAppAuth } from '@octokit/auth-app'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { Octokit } from '@octokit/rest'
import { addGraphQL } from './graphql'
import { addLogging, Logger } from './logging'
import { addPagination } from './pagination'

import { VERSION } from './version'

import { Octokit as OctokitCore  } from '@octokit/core/dist-types'
import { OctokitOptions, ReturnTypeOf } from "@octokit/core/dist-types/types"


export const ProbotOctokit = Octokit
  .plugin([throttling, retry, enterpriseCompatibility])
  .defaults({
    authStrategy: createAppAuth,
    userAgent: `probot/${VERSION}`
  })

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @see {@link https://github.com/octokit/rest.js}
 */
export function GitHubAPI (options: Options = { Octokit: ProbotOctokit } as any) {
  // TODO: `option` need the auth options as required by `@octokit/auth-app`
  //       See: https://github.com/octokit/auth-app.js/#readme

  // const octokit = new options.Octokit(Object.assign(options, {
  //   throttle: Object.assign({
  //     onAbuseLimit: (retryAfter: number) => {
  //       options.logger.warn(`Abuse limit hit, retrying in ${retryAfter} seconds`)
  //       return true
  //     },
  //     onRateLimit: (retryAfter: number) => {
  //       options.logger.warn(`Rate limit hit, retrying in ${retryAfter} seconds`)
  //       return true
  //     }
  //   }, options.throttle)
  // })) as GitHubAPI
  // addPagination(octokit)
  // addLogging(octokit, options.logger)
  // addGraphQL(octokit)
  const finalOptsChangeVarName = Object.assign(options, {
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
  const octokit = new options.Octokit(finalOptsChangeVarName)

  addLogging(octokit, options.logger)

  return octokit as GitHubAPI
}

const x = GitHubAPI({

})

// TODO: Is there a way we can gather the options from Octokit/rest for
// `OctokitOptions` and not have to refer to the lower core module Octokit/core?
export interface Options extends OctokitOptions {
  debug?: boolean
  logger: Logger
  Octokit: typeof Octokit
}

/**
 * @author https://stackoverflow.com/users/2887218/jcalz
 * @see https://stackoverflow.com/a/50375286/10325032
 */
declare type UnionToIntersection<Union> = (Union extends any ? (argument: Union) => void : never) extends (argument: infer Intersection) => void ? Intersection : never;

type OctokitImitation = {
  [x: string]: any;
} & {
  [x: string]: any;
} & OctokitCore & void & {
  // tslint:disable-next-line: no-implicit-dependencies
  paginate: import('@octokit/plugin-paginate-rest').PaginateInterface;
  // tslint:disable-next-line: no-implicit-dependencies no-submodule-imports
} & import('@octokit/plugin-rest-endpoint-methods/dist-types/generated/types').RestEndpointMethods

type OctokitImitationWithoutVoid = {
  [x: string]: any;
} & {
  [x: string]: any;
} & OctokitCore & {
  // tslint:disable-next-line: no-implicit-dependencies
  paginate: import('@octokit/plugin-paginate-rest').PaginateInterface;
  // tslint:disable-next-line: no-implicit-dependencies no-submodule-imports
} & import('@octokit/plugin-rest-endpoint-methods/dist-types/generated/types').RestEndpointMethods

export declare type Constructor<T> = new (...args: any[]) => T

type x = InstanceType<UnionToIntersection<typeof Octokit>>

type x1 = OmitThisParameter<x>
type z = UnionToIntersection<typeof Octokit>

export interface GitHubAPI extends OctokitImitationWithoutVoid {
  // paginate: Paginate
  graphql: Graphql
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
  status: number
}

interface Paginate extends Octokit.Paginate {
  (
    responsePromise: Promise<Octokit.AnyResponse>,
    callback?: (response: Octokit.AnyResponse, done: () => void) => any
  ): Promise<any[]>
}

type Graphql = (query: string, variables?: Variables, headers?: Headers) => ReturnType<typeof graphql>
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
