module.exports = function (github, payload, logins) {
  return github.issues.addAssigneesToIssue({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    assignees: [].concat(logins)
  });
};
