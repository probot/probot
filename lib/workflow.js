const plugin = require('./plugins/base')
const issues = require('./plugins/issues')

class WorkflowCore {
  constructor(events) {
    this.events = events
    this.filterFn = () => true
  }

  filter(fn) {
    this.filterFn = fn;
    return this;
  }

  matchesEvent(event) {
    let eventWithAction = [event.event, event.payload.action];

    return this.events.find((e) => {
      let parts = e.split(".");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] != eventWithAction[i]) {
          return false;
        }
      }
      return true;
    });
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
