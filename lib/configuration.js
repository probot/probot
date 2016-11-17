const debug = require('debug')('PRobot');
const vm = require('vm');

const workflow = require('./workflow');
const URL = require('./utils/url');

module.exports = class Configuration {
  // Get bot config from target repository
  static load(github, repository) {
    debug('Fetching .probot from %s', repository.full_name);
    // HACK: This needs to be reinstated once things are more settled
    //const parts = repository.full_name.split('/');
    //return github.repos.getContent({
    //  owner: parts[0],
    //  repo: parts[1],
    //  path: '.probot'
    //}).then(data => {
    //  const content = new Buffer(data.content, 'base64').toString();
    //  debug('Configuration fetched', content);
    //  return Configuration.parse(content);
    //});
    let s = `
      workflows.push(on("issues.opened")
        .filter((event) => {
            return !event.issue.body.match(/### Steps to Reproduce/)
             || event.issue.body.includes("- [ ]")
          })
        .comment(new URL(".github/MISSING_ISSUE_TEMPLATE_AUTOREPLY.md"))
        .label("insufficient-info")
        .close()
      );
    `
    return Configuration.parse(s)
  }

  static parse(content){
    const sandbox = {
      on: workflow.on,
      URL: URL,
      workflows: [],
    }
    vm.createContext(sandbox);
    vm.runInContext(content, sandbox);
    return new Configuration(sandbox.workflows);
  }

  constructor(workflows) {
    this.workflows = workflows;
  }

  workflowsFor(event) {
    return this.workflows.filter((w) => w.filterFn(event));
  }
};
