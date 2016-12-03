const debug = require('debug')('PRobot');
const Sandbox = require('./sandbox');
const Workflow = require('./workflow');

module.exports = class Configuration {
  constructor(context) {
    this.context = context;
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

  require(path) {
    debug('Fetching %s from %s', path, this.context.payload.repository.full_name);
    return this.context.github.repos.getContent(this.context.toRepo({path})).then(data => {
      return this.parse(new Buffer(data.content, 'base64').toString());
    });
  }

  parse(content) {
    new Sandbox(content).execute(this.api);
    return this;
  }

  execute() {
    return Promise.all(this.workflows.map(w => w.execute(this.context)));
  }
};
