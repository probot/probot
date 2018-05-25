import {GitHubAPI, Headers, Variables} from './'

export function addGraphQL (client) {
  client.query = graphql.bind(null, client)
}

async function graphql (client: GitHubAPI, query: string, variables: Variables, headers: Headers = {}) {
  const res = await client.request({
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      ...headers
    },
    method: 'POST',
    url: '/graphql',

    query,
    variables
  })

  if (res.data.errors) {
    throw new GraphQLError(res.data.errors, query, variables)
  }

  return res.data.data
}

class GraphQLError extends Error {
  public query: string
  public variables: Variables

  constructor (errors, query: string, variables: Variables) {
    super(JSON.stringify(errors))
    this.name = 'GraphQLError'
    this.query = query
    this.variables = variables

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLError)
    }
  }
}
