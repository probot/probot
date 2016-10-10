const yaml = require('js-yaml');
const actions = {
  comment: require('./actions/comment')
};

module.exports = function (github, event) {
  if (event.payload.repository) {
    const config = new Configuration(github, event.payload.repository);
    const dispatcher = new Dispatcher(github, event);

    // Get bot config from target repository
    return config.load().then(config => dispatcher.call(config));
  }
};

class Configuration {
  constructor(github, repository) {
    this.github = github;
    this.repository = repository;
  }

  load(github, repository) {
    return this.github.repos.getContent({
      user: this.repository.owner.login,
      repo: this.repository.name,
      path: '.probot.yml'
    }).then(data => {
      const content = new Buffer(data.content, 'base64').toString();
      Object.assign(this, yaml.safeLoad(content));
      return this;
    });
  }

}

class Dispatcher {
  constructor(github, event) {
    this.github = github;
    this.event = event;
  }

  call(config) {
    // Get behaviors for the event
    const behaviors = config.behaviors.filter(behavior => behavior.on === this.event.event);

    // Handle all behaviors
    return Promise.all(behaviors.map(behavior => this.handle(behavior)));
  }

  handle(behavior) {
    return Promise.all(Object.keys(behavior.then).map(actionName => {
      const action = actions[actionName];
      if (!action) {
        throw new Error('Unknown action: ' + actionName);
      }
      return action(this.github, this.event.payload, behavior.then[actionName]);
    }));
  }
}
