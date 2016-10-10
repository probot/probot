// Unassign one or more users from an issue or pull request.
//
// ```yml
// - then:
//     # Assign a single user
//     unassign: bkeeepers
//
//     # Assign multiple users
//     unassign: [bkeeepers, benbalter]
// ```
//

module.exports = function (github, payload, logins) {
  return github.issues.removeAssigneesFromIssue({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    body: [].concat(logins)
  });
};
