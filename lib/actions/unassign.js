// Unassign one or more users from an issue or pull request.
//
// ```yml
// - then:
//     # Unassign a single user
//     unassign: bkeeepers
//
//     # Unassign multiple users
//     unassign: [bkeeepers, benbalter]
// ```
//

module.exports = function (github, payload, logins) {
  return github.issues.removeAssigneesFromIssue({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    body: {assignees: [].concat(logins)}
  });
};
