// https://mikedeboer.github.io/node-github/#api-issues-edit
module.exports = function (context, attrs) {
  return context.github.issues.edit(context.payload.toIssue(attrs));
};
