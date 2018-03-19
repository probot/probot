module.exports = addGraphQL

function addGraphQL (octokit) {
  octokit.query = query.bind(null, octokit)
}

async function query (octokit, query, variables = undefined, headers = {}) {
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
  constructor (errors, query, variables) {
    super(JSON.stringify(errors))
    this.name = 'GraphQLError'
    this.query = query
    this.variables = variables

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLError)
    }
  }
}
