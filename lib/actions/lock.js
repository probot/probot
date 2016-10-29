module.exports = function (context) {
  return context.github.issues.lock(context.payload.toIssue());
};
