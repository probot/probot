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
    return this.events.find(e => {
      const [name, action] = e.split('.');
      return name === event.event && (!action || action === event.payload.action);
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
