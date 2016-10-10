const actions = require('./actions');

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

module.exports = Dispatcher;
