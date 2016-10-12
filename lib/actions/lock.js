module.exports = function (github, payload) {
  return github.issues.lock(payload.toIssue());
};
