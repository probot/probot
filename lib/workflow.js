const Plugin = require('./plugin');
const Issues = require('./plugins/issues');
const Filter = require('./plugins/filter');

const plugins = [
  new Issues(),
  new Filter()
];

module.exports = class Workflow {
  constructor() {
    this.stack = [];
    this.api = {};

    for (const plugin of plugins) {
      for (const method of plugin.api) {
        this.proxy(plugin, method);
      }
    }
  }

  // Define a new function in the API for the given plugin method
  proxy(plugin, method) {
    // Push new function on the stack that calls the plugin method with a context.
    const fn = (...args) => {
      this.add(context => plugin[method](context, ...args));

      // Return the API to allow methods to be chained.
      return this.api;
    };

    this.api[method] = fn.bind(this);
  }

  execute(context) {
    // Reduce the stack to a chain of promises, each called with the given context
    return this.stack.reduce((promise, func) => {
      return promise.then(func.bind(func, context));
    }, Promise.resolve()).catch(this.catch);
  }

  catch(error) {
    if (error instanceof Plugin.Halt) {
      // silently ignore
    } else {
      throw error;
    }
  }

  add(fn) {
    this.stack.push(fn);
  }
};
