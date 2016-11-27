const Plugin = require('../plugin');

module.exports = class Filter extends Plugin {
  filter(context, fn) {
    const result = fn(context.event);
    if (result === false) {
      return Promise.reject().catch(() => {
        // default catch to prevent warnings
      });
    } else {
      return result;
    }
  }
};
