// Built-in plugin to expose stats about the deployment
module.exports = async robot => {
  const REFRESH_INTERVAL = 60 * 60 * 1000;

  // Cache of stats that get reported
  const stats = {installations: 0, popular: []};

  // Setup /stats endpoint to return cached stats
  robot.router.get('/stats', (req, res) => {
    res.json(stats);
  });

  // Refresh the stats when the plugin is loaded
  refresh();

  // Refresh the stats on an interval
  setInterval(refresh, REFRESH_INTERVAL);

  async function refresh() {
    const installations = await getInstallations();

    stats.installations = installations.length;
    stats.popular = await popularInstallations(installations);
  }

  async function getInstallations() {
    const github = await robot.auth();
    return github.paginate(github.integrations.getInstallations({}), res => {
      return res.data;
    });
  }

  async function popularInstallations(installations) {
    let popular = await Promise.all(installations.map(async installation => {
      const github = await robot.auth(installation.id);

      const repositories = await github.paginate(github.integrations.getInstallationRepositories({}), res => {
        return res.data.repositories.filter(repository => !repository.private);
      });

      const account = installation.account;

      account.stars = repositories.reduce((stars, repository) => {
        return stars + repository.stargazers_count;
      }, 0);

      return account;
    }));

    popular = popular.filter(installation => installation.stars > 0);
    return popular.sort((a, b) => a.stars - b.stars).slice(0, 10);
  }
};
