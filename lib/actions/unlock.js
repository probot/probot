module.exports = function (github, payload) {
  return github.issues.unlock(payload.toIssue());
};
