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
    await initializing
    res.json(stats)
  })

  async function refresh () {
    const installations = await getInstallations()

    stats.installations = installations.length
    stats.popular = await popularInstallations(installations)
  }

  async function getInstallations () {
    const github = await robot.auth()
    const req = github.apps.getInstallations({per_page: 100})
    return github.paginate(req, res => res.data)
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
