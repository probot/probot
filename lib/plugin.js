module.exports = class Plugin {
  get api() {
    const properties = Object.getOwnPropertyNames(this.constructor.prototype);
    properties.splice(properties.indexOf('constructor'), 1);
    return properties;
  }
};
