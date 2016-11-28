const Plugin = require('../plugin');

module.exports = class Filter extends Plugin {
  filter(context, fn) {
    const result = fn(context.event);
    return result === false ? this.halt() : result;
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
