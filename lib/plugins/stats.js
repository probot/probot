const axios = require('axios')

// Built-in plugin to expose stats about the deployment
module.exports = async robot => {
  const REFRESH_INTERVAL = 60 * 60 * 1000

  // Cache of stats that get reported
  const stats = {installations: 0, popular: []}

  // Refresh the stats when the plugin is loaded
  const initializing = refresh()

  // Refresh the stats on an interval
  setInterval(refresh, REFRESH_INTERVAL)

  // Setup /probot/stats endpoint to return cached stats
  robot.router.get('/probot/stats', async (req, res) => {
    // ensure stats are loaded
    // await initializing
    res.json(stats)
  })

  async function refresh () {
    const installations = await getInstallations()

    stats.installations = installations.length
    stats.popular = await getPopularGraphQL(installations)
  }

  async function getInstallations () {
    const github = await robot.auth()
    const req = github.apps.getInstallations({per_page: 100})
    return github.paginate(req, res => res.data)
  }

/**
  * Build a search query that includes all repos the app is installed on.
  *
  * @returns {object}
  *
  * @example
  * Query {
  *   token: 'v2.xxxxxxxxxxxxx' // An installation token that authorizes the app to query GraphQL
  *   queryString: 'repo:github/gitignore repo:facebook/react' // A string that includes the account name and the name of the repo
  * }
  *
  */
  async function buildQuery (installations) {
    let Query = await Promise.all(installations.map(async installation => {
      const github = await robot.auth(installation.id)
      const req = github.apps.getInstallationRepositories({per_page: 100})
      repositories = await github.paginate(req, res => {
        return res.data.repositories.filter(repository => !repository.private)
      })
      let queryString = ''
      repositories.forEach(repository => {
        queryString += 'repo:' + installation.account.login + '/' + repository.name + ' '
      })
      return {
        token: github.auth.token,
        queryString
      }
    }))

    return Query
  }

  /**
   * Returns the top 10 repos (ordered by stars) from the list of repos
   * constructed from buildQuery()
   * @returns {Array} - Array of all GraphQL edge nodes
   *
   * @example
   *    [ {
   *        node: { name: 'react', stargazers: { totalCount:	85592 }, owner: { login:	'facebook' } }
   *      },
   *      {
   *        node: { name: 'gitignore', stargazers: { totalCount:	60035 }, owner: { login:	'github' } }
   *      } ]
   */
  async function getPopularGraphQL (installations) {
    let Query = await buildQuery(installations)
    const token = Query[0].token
    const queryString = Query.reduce((a, b) => {
      return a.queryString + b.queryString
    })

    let graphql = axios.create({
      url: 'https://api.github.com/graphql',
      headers: {
        'Authorization': `token ${token}`, // Token obtained from an app's installation.id (above)
        'User-Agent': 'Test-Probot-GraphQL',
        'Content-Type': 'application/graphql'
      },
      data: {
        query: `query ($query: String!) {
            search(first: 10, type: REPOSITORY, query: $query) {
              edges {
                node {
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
            }
          }`
      }
    })

    let res = await graphql({
      method: 'post',
      data: {
        variables: {'query': `${queryString} sort:stars`}
      }
    })

    return res.data.data.search.edges
  }

  async function popularInstallations (installations) {
    let popular = await Promise.all(installations.map(async installation => {
      const github = await robot.auth(installation.id)

      const req = github.apps.getInstallationRepositories({per_page: 100})
      const repositories = await github.paginate(req, res => {
        return res.data.repositories.filter(repository => !repository.private)
      })
      const account = installation.account

      account.stars = repositories.reduce((stars, repository) => {
        return stars + repository.stargazers_count
      }, 0)

      return account
    }))

    popular = popular.filter(installation => installation.stars > 0)
    return popular.sort((a, b) => b.stars - a.stars).slice(0, 10)
  }
}
