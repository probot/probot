const debug = require('debug')('PRobot');
const yaml = require('js-yaml');

module.exports = class Configuration {
  // Get bot config from target repository
  static load(github, repository) {
    debug('Fetching .probot.yml from %s', repository.full_name);
    const parts = repository.full_name.split('/');
    return github.repos.getContent({
      owner: parts[0],
      repo: parts[1],
      path: '.probot.yml'
    }).then(data => {
      const content = new Buffer(data.content, 'base64').toString();
      debug('Configuration fetched', content);
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
        (!parts[1] || parts[1] === event.payload.action);
    });
  }
};
