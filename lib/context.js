module.exports = class Context {
  constructor(github, event) {
    this.github = github;
    this.event = event;
    this.payload = event.payload;
  }

  toRepo(object) {
    const repo = this.payload.repository;

    return Object.assign({
      owner: repo.owner.login || repo.owner.name,
      repo: repo.name
    }, object);
  }

  toIssue(object) {
    return Object.assign({
      number: (this.payload.issue || this.payload.pull_request || this.payload).number
    }, this.toRepo(), object);
  }
};
