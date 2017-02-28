const Plugin = require('../plugin');

module.exports = class Filter extends Plugin {
  filter(context, fn) {
    const result = fn(context.event, context);
    return result === false ? this.halt() : result;
  }

  then(context, fn) {
    return fn(context.event, context);
  }

  halt() {
    return Promise.reject(new Error('halted'));
  }

  on(context, ...events) {
    const res = events.find(e => {
      const [name, action] = e.split('.');
      return name === context.event.event &&
        (!action || action === context.event.payload.action);
    });

    return res ? Promise.resolve(res) : this.halt();
  }
};
