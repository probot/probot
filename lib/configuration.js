const debug = require('debug')('PRobot');
const Sandbox = require('./sandbox');

module.exports = class Configuration {
  // Get bot config from target repository
  static load(github, repository) {
    debug('Fetching .probot.js from %s', repository.full_name);
    const parts = repository.full_name.split('/');
    return github.repos.getContent({
      owner: parts[0],
      repo: parts[1],
      path: '.probot.js'
    }).then(data => {
      const content = new Buffer(data.content, 'base64').toString();
      debug('Configuration fetched', content);
      return Configuration.parse(content);
    });
  }

  static parse(content) {
    const sandbox = new Sandbox(content);
    return new Configuration(sandbox.execute());
  }

  constructor(workflows) {
    this.workflows = workflows;
  }
};
