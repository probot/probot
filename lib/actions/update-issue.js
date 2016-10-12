// https://mikedeboer.github.io/node-github/#api-issues-edit
module.exports = function (github, payload, attrs) {
  return github.issues.edit(payload.toIssue(attrs));
};
