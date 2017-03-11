const Filter = require('./plugins/filter');
const Issues = require('./plugins/issues');

const defaultPlugins = [
  new Filter(),
  new Issues()
];

module.exports = class Workflow {
  constructor(plugins = defaultPlugins) {
    this.stack = [];
    this.api = {};

    // Define a new function in the API for each plugin method
    for (const plugin of plugins) {
      for (const method of plugin.api) {
        this.api[method] = this.proxy(plugin[method]).bind(this);
      }
    }
  }

  proxy(fn) {
    return (...args) => {
      // Push new function on the stack that calls the plugin method with a context.
      this.stack.push(context => {
        // Resolve all args before passing to plugin
        return Promise.all(args).then(args => fn(context, ...args));
      });

      // Return the API to allow methods to be chained.
      return this.api;
    };
  }

  execute(context) {
    // Reduce the stack to a chain of promises, each called with the given context
    return this.stack.reduce((promise, func) => {
      return promise.then(func.bind(func, context));
    }, Promise.resolve());
  }
};
