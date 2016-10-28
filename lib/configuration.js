const debug = require('debug')('PRobot');
const Transformer = require('./transformer');

let parser;

try {
  parser = require('./parser');
} catch (err) {
  // Fall back to generating parser at runtime
  const peg = require('pegjs');
  const fs = require('fs');
  const path = require('path');

  const grammar = fs.readFileSync(path.join(__dirname, 'parser.pegjs')).toString();
  parser = peg.generate(grammar);
}

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

  behaviorsFor(event) {
    return this.behaviors.filter(behavior => {
      return behavior.on.filter(e => {
        return e.name === event.event &&
          (!e.action || e.action === event.payload.action);
      }).length > 0;
    });
  }
};
