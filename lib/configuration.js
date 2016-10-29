const debug = require('debug')('PRobot');
const Transformer = require('./transformer');
const parser = require('./parser');

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
    const transformer = new Transformer(parser.parse(content));
    return new Configuration(transformer.transform());
  }

  constructor(behaviors) {
    this.behaviors = behaviors;
  }

  // FIXME: this can be moved into Behavior as a condition
  behaviorsFor(event) {
    return this.behaviors.filter(behavior => {
      return behavior.events.filter(e => {
        return e.name === event.event &&
          (!e.action || e.action === event.payload.action);
      }).length > 0;
    });
  }
};
