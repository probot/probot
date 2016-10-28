const Payload = require('./payload');

class Dispatcher {
  constructor(github, event) {
    this.github = github;
    this.event = event;
  }

  call(config) {
    // Get behaviors for the event
    const behaviors = config.behaviorsFor(this.event);

    // Handle all behaviors
    return Promise.all(behaviors.map(behavior => this.handle(behavior)));
  }

  handle(behavior) {
    const payload = new Payload(this.event.payload);
    return behavior.perform(this.github, payload);
  }
}

module.exports = Dispatcher;
