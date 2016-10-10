const yaml = require('js-yaml');

class Configuration {
  constructor(github, repository) {
    this.github = github;
    this.repository = repository;
  }

  // Get bot config from target repository
  load() {
    return this.github.repos.getContent({
      user: this.repository.owner.login,
      repo: this.repository.name,
      path: '.probot.yml'
    }).then(data => {
      const content = new Buffer(data.content, 'base64').toString();
      Object.assign(this, yaml.safeLoad(content));
      return this;
    });
  }
}

module.exports = Configuration;
