const Context = require('./context');

class Dispatcher {
  constructor(github, event) {
    this.github = github;
    this.event = event;
  }

  call(config) {
    // Get behaviors for the event
    const behaviors = config.behaviorsFor(this.event);
    const context = new Context(this.github, config, this.event);

    // Handle all behaviors
    return Promise.all(behaviors.map(behavior => {
      return behavior.perform(context);
    }));
  }
}

module.exports = Dispatcher;
