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
    return new Configuration().parse(content);
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

  parse(content) {
    new Sandbox(content).execute(this.api);
    return this;
  }

  execute(context) {
    return Promise.all(this.workflows.map(w => w.execute(context)));
  }
};
