const URL = require('./utils/url');
const Workflow = require('./workflow');

class Sandbox {
  constructor() {
    this.workflows = [];

    this.api = {
      on: this.on.bind(this),
      URL
    };
  }

  on(...events) {
    const workflow = new Workflow(events);
    this.workflows.push(workflow);
    return workflow;
  }
}

module.exports = Sandbox;
