const Issues = require('./plugins/issues');
const Routing = require('./plugins/routing');

const plugins = [
  new Issues(),
  new Routing()
];

module.exports = class Workflow {
  constructor(events) {
    this.stack = [];
    this.events = events;
    this.filterFn = () => true;
    this.api = {};

    // Define a new function in the API for each plugin method
    for (const plugin of plugins) {
      for (const method of plugin.api) {
        this.api[method] = this.proxy(plugin[method]).bind(this);
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

  proxy(fn) {
    return (...args) => {
      // Push new function on the stack that calls the plugin method with a context.
      this.stack.push(context => {
        // Resolve all args before passing to plugin
        Promise.all(args).then(args => fn(context, ...args));
      });

      // Return the API to allow methods to be chained.
      return this.api;
    };
  }

  execute(context) {
    if (this.matches(context.event)) {
      // Reduce the stack to a chain of promises, each called with the given context
      return this.stack.reduce((promise, func) => {
        return promise.then(func.bind(func, context));
      }, Promise.resolve());
    }
  }
};
