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

  matches(event) {
    const eventWithAction = [event.event, event.payload.action];

    return this.events.find(e => {
      const parts = e.split('.');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== eventWithAction[i]) {
          return false;
        }
      }
      return true;
    }) && this.filterFn(event);
  }
}

// FIXME: issues
const plugins = [
  issues.Plugin
];

// Helper to combine an array of mixins into one class
function mix(superclass, ...mixins) {
  return mixins.reduce((c, mixin) => mixin(c), superclass);
}

class Workflow extends mix(WorkflowCore, ...plugins) {}

module.exports = Workflow;
