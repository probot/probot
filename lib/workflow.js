const plugin = require('./plugins/base')
const issues = require('./plugins/issues')

class WorkflowCore {
  constructor(events) {
    this.events = events
  }

  filter(fn) {
    this.filterFn = fn;
    return this;
  }
}

// FIXME: issues
plugins = [
  issues.Plugin
]

class Workflow extends plugin.mix(WorkflowCore).with(...plugins) {}

on = (...events) => {
  return new Workflow(events);
}

module.exports = {
  Workflow: Workflow,
  on: on
}
