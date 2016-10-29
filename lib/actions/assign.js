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

module.exports = function (context, logins) {
  return context.github.issues.addAssigneesToIssue(
    context.payload.toIssue({assignees: [].concat(logins)})
  );
};
