const plugin = require('./plugins/base');
const issues = require('./plugins/issues');

class WorkflowCore {
  constructor(events) {
    this.events = events;
    this.filterFn = () => true;
  }

  filter(fn) {
    this.filterFn = fn;
    return this;
  }

  matchesEvent(event) {
    const eventWithAction = [event.event, event.payload.action];

    return this.events.find(e => {
      const parts = e.split('.');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== eventWithAction[i]) {
          return false;
        }
      }
      return true;
    });
  }
}

// FIXME: issues
const plugins = [
  issues.Plugin
];

class Workflow extends plugin.mix(WorkflowCore).with(...plugins) {}

const on = (...events) => {
  return new Workflow(events);
};

module.exports = {
  Workflow,
  on
};
