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

module.exports = function (context, ...logins) {
  return context.github.issues.removeAssigneesFromIssue(
    context.payload.toIssue({body: {assignees: logins}})
  );
};
