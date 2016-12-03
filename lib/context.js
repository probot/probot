const Payload = require('./payload');

module.exports = class Context {
  constructor(github, config, event) {
    this.github = github;
    this.event = event;
    this.config = config;
    this.payload = new Payload(event.payload);
  }

  toRepo(object) {
    return Object.assign({}, object, {
      owner: this.payload.repository.owner.login,
      repo: this.payload.repository.name
    });
  }

  toIssue(object) {
    return Object.assign({}, object, {
      number: (this.payload.issue || this.payload.pull_request || this.payload).number
    }, this.toRepo());
  }
};
