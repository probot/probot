module.exports = class Context {
  constructor(event) {
    this.event = event;
  }

  repo(object) {
    const repo = this.event.payload.repository;

    return Object.assign({
      owner: repo.owner.login || repo.owner.name,
      repo: repo.name
    }, object);
  }

  issue(object) {
    const payload = this.event.payload;
    return Object.assign({
      number: (payload.issue || payload.pull_request || payload).number
    }, this.repo(), object);
  }

  get isBot() {
    return this.event.payload.sender.type === 'Bot';
  }
};
