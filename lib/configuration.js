const yaml = require('js-yaml');

module.exports = class Configuration {
  // Get bot config from target repository
  static load(github, repository) {
    return github.repos.getContent({
      user: repository.owner.login,
      repo: repository.name,
      path: '.probot.yml'
    }).then(data => {
      const content = new Buffer(data.content, 'base64').toString();
      return new Configuration(yaml.safeLoad(content));
    });
  }

  constructor(config) {
    Object.assign(this, config);
  }

  behaviorsFor(event) {
    return this.behaviors.filter(behavior => {
      const parts = behavior.on.split('.');
      return parts[0] === event.event &&
        (!parts[1] || parts[1] == event.payload.action)
    })
  }
}
