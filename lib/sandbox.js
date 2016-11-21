const vm = require('vm');
const Workflow = require('./workflow');
const Timer = require('./timer');

class Sandbox {
  constructor(content) {
    this.content = content;
    this.workflows = [];
    this.timers = [];

    this.api = {
      on: this.on.bind(this),
      every: this.every.bind(this)
    };
  }

  on(...events) {
    const workflow = new Workflow(events);
    this.workflows.push(workflow);
    return workflow;
  }

  every(interval, callback) {
    const timer = new Timer(interval, callback);
    this.timers.push(timer);
  }

  execute() {
    vm.createContext(this.api);
    vm.runInContext(this.content, this.api);
    return this.workflows;
  }
}

module.exports = Sandbox;
