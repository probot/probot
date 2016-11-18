const vm = require('vm');
const debug = require('debug')('PRobot');
const Sandbox = require('./sandbox');

module.exports = class Configuration {
  // Get bot config from target repository
  static load(github, repository) {
    debug('Fetching .probot from %s', repository.full_name);
    const parts = repository.full_name.split('/');
    return github.repos.getContent({
      owner: parts[0],
      repo: parts[1],
      path: '.probot'
    }).then(data => {
      const content = new Buffer(data.content, 'base64').toString();
      debug('Configuration fetched', content);
      return Configuration.parse(content);
    });
  }

  static parse(content) {
    const sandbox = new Sandbox();
    vm.createContext(sandbox.api);
    vm.runInContext(content, sandbox.api);
    return new Configuration(sandbox.workflows);
  }

  constructor(workflows) {
    this.workflows = workflows;
  }

  workflowsFor(event) {
    return this.workflows.filter(w => {
      return w.matchesEvent(event) && w.filterFn(event);
    });
  }
};
