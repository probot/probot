const debug = require('debug')('PRobot');
const actions = require('./actions');
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

    return Promise.all(behavior.then.map(action => {
      if (!actions[action.name]) {
        throw new Error('Unknown action: ' + action.name);
      }
      debug('action: %s', action.name, action.value);
      return actions[action.name](this.github, payload, action.value);
    }));
  }
}

module.exports = Dispatcher;
