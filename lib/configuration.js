const debug = require('debug')('PRobot');
const Sandbox = require('./sandbox');
const Workflow = require('./workflow');
const url = require('./util/github-url');

module.exports = class Configuration {
  static load(context, path) {
    const options = url(path);
    debug('Fetching %s from %s', path, context.payload.repository.full_name);
    return context.github.repos.getContent(context.toRepo(options)).then(data => {
      return new Configuration(context).parse(new Buffer(data.content, 'base64').toString());
    });
  }

  constructor(context) {
    this.context = context;
    this.workflows = [];

    this.api = {
      on: this.on.bind(this),
      include: this.include.bind(this)
    };
  }

  on(...events) {
    const workflow = new Workflow(events);
    this.workflows.push(workflow);
    return workflow.api;
  }

  include(path) {
    const load = Configuration.load(this.context, path);

    this.workflows.push({
      execute() {
        return load.then(config => config.execute(this.context));
      }
    });

    return undefined;
  }

  parse(content) {
    new Sandbox(content).execute(this.api);
    return this;
  }

  execute() {
    return Promise.all(this.workflows.map(w => w.execute(this.context)));
  }
};
