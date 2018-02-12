const { GraphQLClient } = require('graphql-request')

// Built-in plugin to expose stats about the deployment
module.exports = async robot => {
  const REFRESH_INTERVAL = 60 * 60 * 1000

  // Cache of stats that get reported
  const stats = {installations: 0, popular: {}}

  // Refresh the stats when the plugin is loaded
  const initializing = refresh()

  // Refresh the stats on an interval
  setInterval(refresh, REFRESH_INTERVAL)

  // Setup /probot/stats endpoint to return cached stats
  robot.router.get('/probot/stats', async (req, res) => {
    // ensure stats are loaded
    await initializing
    res.json(stats)
  })

  async function refresh () {
    const installations = await getInstallations()

    stats.installations = installations.length

    let searchResults = await getPopularGraphQL(installations)

    searchResults.forEach(result => {
      let login = result.owner.login
      let stars = result.stargazers.totalCount
      if (stats.popular[login] === undefined) {
        stats.popular[login] = {stars}
      } else {
        stats.popular[login].stars += stars
      }
    })
    robot.log('stats:', stats)
  }

  async function getInstallations () {
    const github = await robot.auth()
    const req = github.apps.getInstallations({per_page: 100})
    return github.paginate(req, res => res.data)
  }

/**
  * Build a search query that includes all repos the app is installed on.
  *
  * @returns {Array} - Array of Query Parameters
  *
  * @example
  * [
  *   Query {
  *     id: '12345' // An installation id used to obtain an auth token later
  *     queryString: 'org:github' // Search string scoped to the user/org
  *   }
  * ]
  */
  function buildQuery (installations) {
    let queryParams = []
    installations.map(installation => {
      queryParams.push({
        search: 'org:' + installation.account.login + ' ',
        id: installation.id
      })
    })
    return queryParams
  }

  /**
   * Returns the top 10 repos (ordered by stars) from the list of repos
   * constructed from buildQuery()
   * @returns {Array} - Array of all GraphQL nodes
   *
   * @example
   *    [ {
   *        name: 'react', stargazers: { totalCount:	85592 }, owner: { login:	'facebook' }
   *      },
   *      {
   *        name: 'gitignore', stargazers: { totalCount:	60035 }, owner: { login:	'github' }
   *      } ]
   */
  async function getPopularGraphQL (installations) {
    let Query = buildQuery(installations)
    const queryString = Query.reduce((a, b) => {
      return a.search + b.search
    })

    const github = await robot.auth(Query[0].id)
    const token = github.auth.token

    const client = new GraphQLClient('https://api.github.com/graphql', {
      headers: {
        'Authorization': `token ${token}`, // Token obtained from an app's installation.id (above)
        'User-Agent': 'Probot-GraphQL-request',
        'Content-Type': 'application/json'
      }
    })

    const query = `query ($query: String!) {
            search(first: 10, type: REPOSITORY, query: $query) {
              nodes {
                ... on Repository {
                  name
                  stargazers {
                    totalCount
                  }
                  owner {
                    login
                  }
                }
              }
            }
          }`


    const variables = {'query': `${queryString} sort:stars stars:>=1`}

    const res = await client.request(query, variables)

    return res.search.nodes
  }

}
