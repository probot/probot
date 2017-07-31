// Built-in plugin to expose stats about the deployment
module.exports = async (robot) => {
  const installations = await getInstallations();
  const stats = {
    installations: installations.length,
    popular: await popularInstallations(installations)
  };

  robot.router.get('/stats', (req, res) => {
    res.json(stats);
  });

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
