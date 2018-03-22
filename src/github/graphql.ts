export const addGraphQL = function (octokit) {
  octokit.query = query.bind(null, octokit)
}

async function query (octokit, query: string, variables: Variables, headers = {}) {
  const res = await octokit.request({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      ...headers
    },
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

type Variables = { [key: string]: any }
