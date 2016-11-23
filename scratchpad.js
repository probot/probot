// Plugins are just a class
class IssuesPlugin {
  // plugins can be initialized with state that is available in any of the methods
  constructor(state) {
    this.state = state;
  }

  // All defined methods become available in the api.
  // each method takes a `context` argument that has access to the context it was called in.
  comment(context, message) {
    // Methods that make network calls should return a promise
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("comment:", message, this.state, context);
        resolve();
      }, 1000);
    });
  }

  close(context) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("close");
        resolve();
      }, 1000);
    });
  }
}

PLUGINS = [
  new IssuesPlugin("state")
];

class Workflow {
  constructor() {
    this.stack = [];
    this.api = {};

    PLUGINS.forEach(plugin => {
      // Get all the property names of the plugin
      for(let method of Object.getOwnPropertyNames(plugin.constructor.prototype)) {
        if(method !== 'constructor') {
          // Define a new function in the API for this plugin method, forcing
          // the binding to this to prevent any tampering.
          this.api[method] = this.proxy(plugin, method).bind(this);
        }
      }
    });
  }

  proxy(plugin, method) {
    return (...args) => {
      // When this method is called, push new function on the stack that
      this.stack.push((context) => {
        return plugin[method].call(plugin, context, ...args);
      });

      // Return the API to allow methods to be chained.
      return this.api;
    }
  }

  // Execute the stack for this workflow with the given context
  execute(context) {
    this.stack.reduce((promise, func) => {
      return promise.then(func.bind(func, context));
    }, Promise.resolve(context));
  }
}

workflow = new Workflow();

// workflow.api would be passed into a sandbox
workflow.api.comment("Hello").close();

// Execute the workflow with the given context
w.execute({name: 'Brandon'});
