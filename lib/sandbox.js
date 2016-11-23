const vm = require('vm');
const Workflow = require('./workflow');

class Sandbox {
  constructor(content) {
    this.content = content;
    this.workflows = [];

    this.api = {
      on: this.on.bind(this)
    };
  }

  on(...events) {
    const workflow = new Workflow(events);
    this.workflows.push(workflow);
    return workflow.api;
  }

  execute() {
    vm.createContext(this.api);
    vm.runInContext(this.content, this.api);
    return this.workflows;
  }
}

module.exports = Sandbox;
