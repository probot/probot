const Payload = require('./payload');

module.exports = class Context {
  constructor(github, config, event) {
    this.github = github;
    this.event = event;
    this.config = config;
    this.payload = new Payload(event.payload);
  }
};
