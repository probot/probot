import { OctokitWithPagination, Variables } from './'

export const addGraphQL = function (octokit) {
  octokit.query = graphql.bind(null, octokit)
}

async function graphql (octokit: OctokitWithPagination, query: string, variables: Variables, headers = {}) {
  const res = await octokit.request({
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

interface GraphQLError {
  query: string
  variables: Variables
}
