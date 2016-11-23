const Issues = require('./plugins/issues');

const plugins = [
  new Issues()
];

module.exports = class Workflow {
  constructor(events) {
    this.stack = [];
    this.events = events;
    this.filterFn = () => true;
    this.api = {};

    for (const plugin of plugins) {
      // Get all the property names of the plugin
      for (const method of Object.getOwnPropertyNames(plugin.constructor.prototype)) {
        if (method !== 'constructor') {
          // Define a new function in the API for this plugin method, forcing
          // the binding to this to prevent any tampering.
          this.api[method] = this.proxy(plugin, method).bind(this);
        }
      }
    }

    this.api.filter = this.filter.bind(this);
  }

  filter(fn) {
    this.filterFn = fn;
    return this.api;
  }

  matches(event) {
    return this.events.find(e => {
      const [name, action] = e.split('.');
      return name === event.event && (!action || action === event.payload.action);
    }) && this.filterFn(event);
  }

  proxy(plugin, method) {
    // This function is what gets exposed to the sandbox
    return (...args) => {
      // Push new function on the stack that calls the plugin method with a context.
      this.stack.push(context => plugin[method](context, ...args));

      // Return the API to allow methods to be chained.
      return this.api;
    };
  }

  execute(context) {
    if (this.matches(context.event)) {
      // Reduce the stack to a chain of promises, each called with the given context
      this.stack.reduce((promise, func) => {
        return promise.then(func.bind(func, context));
      }, Promise.resolve());
    }
  }
};
