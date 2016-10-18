// Assign one or more users to an issue or pull request.
//
// ```
// # Assign a single user
// then assign(bkeepers);
//
// # Assign multiple users
// then assign(bkeepers, benbalter);
// ```
//

module.exports = function (github, payload, logins) {
  return github.issues.addAssigneesToIssue(
    payload.toIssue({assignees: [].concat(logins)})
  );
};
