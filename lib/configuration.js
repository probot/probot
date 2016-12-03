const debug = require('debug')('PRobot');
const Sandbox = require('./sandbox');
const Workflow = require('./workflow');

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
    const config = new Configuration();
    new Sandbox(content).execute(config.api);
    return config;
  }

  constructor() {
    this.workflows = [];

    this.api = {
      on: this.on.bind(this)
    };
  }

  on(...events) {
    const workflow = new Workflow(events);
    this.workflows.push(workflow);
    return workflow.api;
  }
};
