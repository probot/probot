module.exports = class Payload {
  constructor(params) {
    Object.assign(this, params);
  }

  toIssue(object) {
    return Object.assign(object, {
      owner: this.repository.owner.login,
      repo: this.repository.name,
      number: this.issue.number
    });
  }
};
