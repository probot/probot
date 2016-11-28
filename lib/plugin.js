class Plugin {
  get api() {
    const properties = Object.getOwnPropertyNames(this.constructor.prototype);
    properties.splice(properties.indexOf('constructor'), 1);
    return properties;
  }

  halt() {
    return Promise.reject(new Plugin.Halt('halted'));
  }
}

Plugin.Halt = class extends Error { };

module.exports = Plugin;
