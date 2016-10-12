const jwt = require('./jwt');
const GitHubApi = require('github');

const github = new GitHubApi();
const installations = {};

module.exports = {
  load: function() {
    github.authenticate({type: 'integration', token: jwt()});

    github.integrations.getInstallations({per_page: 100}).then(data => {
      data.forEach(this.register);
    });
  },

  register: function(installation) {
    installations[installation.account.login] = installation;
  },

  unregister: function(installation) {
    delete installations[installation.account.login];
  },

  for: function(account) {
    return installations[account];
  },

  listen: function(webhook) {
    webhook.on('integration_installation', function(event) {
      if (event.payload.action == 'create') {
        this.register(event.payload.installation);
      } else if (event.payload.action == 'deleted') {
        this.unregister(event.payload.installation);
      }
    });
  },

  authAs: function(installation) {
    const github = new GitHubApi();
    github.authenticate({type: 'integration', token: jwt()});
    return github.integrations.createInstallationToken({
      installation_id: installation.id
    });
  }
}
