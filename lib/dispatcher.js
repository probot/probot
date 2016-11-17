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
    const workflows = config.workflowsFor(this.event);

    // FIXME: have a better method to register evaluators
    let evaluators = [
      issues.Evaluator,
    ]

    // Handle all behaviors
    return Promise.all(workflows.map(w => {
      evaluators.forEach((e) => {
        let evaluator = new e;
        return evaluator.evaluate(w, context);
      })
    }));
  }
}

module.exports = Dispatcher;
