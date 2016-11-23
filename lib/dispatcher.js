const Context = require('./context');

class Dispatcher {
  constructor(github, event) {
    this.github = github;
    this.event = event;
  }

  call(config) {
    // Get behaviors for the event
    const context = new Context(this.github, config, this.event);

    // Handle all behaviors
    return Promise.all(config.workflows.map(w => w.execute(context)));
  }
}

module.exports = Dispatcher;
