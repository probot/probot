const GitHubApi = require('github');
const jwt = require('./jwt');

const github = new GitHubApi();
const installations = {};

module.exports = {
  load: () => {
    github.authenticate({type: 'integration', token: jwt()});

    // Get all installations. Eventually loading all installations on startup
    // will not scale, but it will work until persistence is figured out.
    // FIXME: handle pagination
    github.integrations.getInstallations({per_page: 100}).then(data => {
      data.forEach(this.register);
    });
  },

  register: installation => {
    installations[installation.account.login] = installation;
  },

  unregister: installation => {
    delete installations[installation.account.login];
  },

  // Get the installation for an account
  for: account => {
    return installations[account];
  },

  // listen for installations or uninstallations
  listen: webhook => {
    webhook.on('integration_installation', event => {
      if (event.payload.action === 'create') {
        this.register(event.payload.installation);
      } else if (event.payload.action === 'deleted') {
        this.unregister(event.payload.installation);
      }
    });
  },

  // https://developer.github.com/early-access/integrations/authentication/#as-an-installation
  authAs: installation => {
    const github = new GitHubApi();
    github.authenticate({type: 'integration', token: jwt()});
    return github.integrations.createInstallationToken({
      installation_id: installation.id
    }).then(auth => {
      // TODO: cache
      github.authenticate({type: 'token', token: auth.token});
      return github;
    });
  }
};
