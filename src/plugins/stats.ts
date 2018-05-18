// Built-in plugin to expose stats about the deployment
module.exports = async (robot: any): Promise<void> => {
  if (process.env.DISABLE_STATS) {
    return
  }

  const REFRESH_INTERVAL = 60 * 60 * 1000

  // Cache of stats that get reported
  const stats = {installations: 0, popular: [{}]}

  // Refresh the stats when the plugin is loaded
  const initializing = refresh()

  // Refresh the stats on an interval
  setInterval(refresh, REFRESH_INTERVAL)

  // Check for accounts (typically spammy or abusive) to ignore
  const ignoredAccounts = (process.env.IGNORED_ACCOUNTS || '').toLowerCase().split(',')

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

  async function getInstallations (): Promise<Installation[]> {
    const github = await robot.auth()
    const req = github.apps.getInstallations({per_page: 100})
    return github.paginate(req, res => res.data)
  }

  async function popularInstallations (installations: Installation[]): Promise<Account[]> {
    let popular = await Promise.all(installations.map(async (installation) => {
      const github = await robot.auth(installation.id)

      const req = github.apps.getInstallationRepositories({per_page: 100})
      const repositories: Repository[] = await github.paginate(req, res => {
        return res.data.repositories.filter(repository => !repository.private)
      })
      const account = installation.account

      if (ignoredAccounts.includes(installation.account.login.toLowerCase())) {
        account.stars = 0
        robot.log.debug({installation}, 'Installation is ignored')
      } else {
        account.stars = repositories.reduce((stars, repository) => {
          return stars + repository.stargazers_count
        }, 0)
      }

      return account
    }))

    popular = popular.filter(installation => installation.stars > 0)
    return popular.sort((a, b) => b.stars - a.stars).slice(0, 10)
  }
}

interface Installation {
  id: number
  account: Account
}

interface Account {
  stars: number
  login: string
}

interface Repository {
  private: boolean
  stargazers_count: number
}
