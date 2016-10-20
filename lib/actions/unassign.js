// Unassign one or more users from an issue or pull request.
//
// ```
// # Unassign a single user
// then unassign(bkeepers);
//
// # Unassign multiple users
// then unassign(bkeepers, benbalter);
// ```
//

module.exports = function (github, payload, logins) {
  return github.issues.removeAssigneesFromIssue(
    payload.toIssue({body: {assignees: [].concat(logins)}})
  );
};
