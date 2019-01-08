// tslint:disable-next-line
import octokitGraphqlWithDefaults from '@octokit/graphql/lib/with-defaults'

import {
  GitHubAPI
} from './'

export interface GraphQLError {
  message: string,
  locations?: Array<{ line: number, column: number }>,
  path?: Array<string | number>,
  extensions?: {
    [key: string]: any
  }
}

export function addGraphQL (client: GitHubAPI) {
  const graphql = octokitGraphqlWithDefaults(client.request, {
    method: 'POST',
    url: '/graphql',
    ...(process.env.GHE_HOST ? { baseUrl: `https://${process.env.GHE_HOST}/api` } : {})
  })
  client.graphql = (...args: any[]): any => {
    if (args[2]) {
      // tslint:disable-next-line:no-console
      console.warn(`github.graphql: passing extra headers as 3rd argument is deprecated. You can pass headers in the 2nd argument instead, using the "headers" key:

    github.graphql(query, { headers })

See https://probot.github.io/docs/github-api/#graphql-api`)

      args[1] = Object.assign(args[1] || {}, { headers: args[2] })
    }

    return graphql(args[0], args[1])
  }
  client.query = (...args: any[]): any => {
    // tslint:disable-next-line:no-console
    console.warn('github.query is deprecated. Use github.graphql instead')
    return client.graphql(args[0], args[1], args[2])
  }
}
