const Sandbox = require('./sandbox');
const Workflow = require('./workflow');
const url = require('./util/github-url');
const log = require('./log');

module.exports = class Configuration {
  static load(context, path, source) {
    const options = context.toRepo(url(path, source));
    log.debug(options, 'Fetching config');
    return context.github.repos.getContent(options).then(data => {
      const config = new Configuration(context, options);
      return config.parse(new Buffer(data.content, 'base64').toString());
    });
  }

  constructor(context, source) {
    this.context = context;
    this.source = source || {};
    this.workflows = [];

    this.api = {
      on: this.on.bind(this),
      include: this.include.bind(this),
      contents: this.contents.bind(this)
    };
  }

  on(...events) {
    const workflow = new Workflow();
    this.workflows.push(workflow);
    return workflow.api.on(...events);
  }

  include(path) {
    const load = Configuration.load(this.context, path, this.source);

    this.workflows.push({
      execute() {
        return load.then(config => config.execute(this.context));
      }
    });

    return undefined;
  }

  contents(path) {
    const options = this.context.toRepo(url(path, this.source));
    log.debug(options, 'Getting contents');
    return this.context.github.repos.getContent(options).then(data => {
      return new Buffer(data.content, 'base64').toString();
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
