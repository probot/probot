const Context = require('./context');
const issues = require('./plugins/issues');

class Dispatcher {
  constructor(github, event) {
    this.github = github;
    this.event = event;
  }

  call(config) {
    // Get behaviors for the event
    const context = new Context(this.github, config, this.event);

    // FIXME: have a better method to register evaluators
    const evaluators = [
      issues.Evaluator
    ];

    // Handle all behaviors
    return Promise.all(config.workflows.map(w => {
      if (w.matches(this.event)) {
        return evaluators.map(E => {
          const evaluator = new E();
          return evaluator.evaluate(w, context);
        });
      } else {
        return false;
      }
    }).reduce((a, b) => {
      return a.concat(b);
    }, []));
  }
}

module.exports = Dispatcher;
