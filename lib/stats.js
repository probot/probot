const paginate = require('./paginate');

module.export = async function (app) {
  const installations = await getInstallations();

  return {
    installations: installations.length,
    popular: await popularInstallations(installations)
  };

  async function getInstallations() {
    const github = await app.asApp();
    return paginate.call(github, github.integrations.getInstallations({}), res => {
      return res.data;
    });
  }

  async function popularInstallations(installations) {
    let popular = await Promise.all(installations.map(async installation => {
      const github = await app.asInstallation(installation.id);

      const repositories = await paginate.call(github, github.integrations.getInstallationRepositories({}), res => {
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
