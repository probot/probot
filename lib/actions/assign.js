// Assign one or more users to an issue or pull request.
//
// ```yml
// - then:
//     # Assign a single user
//     assign: bkeeepers
//
//     # Assign multiple users
//     assign: [bkeeepers, benbalter]
// ```
//

module.exports = function (github, payload, logins) {
  return github.issues.addAssigneesToIssue(
    payload.toIssue({assignees: [].concat(logins)})
  );
};
