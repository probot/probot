module.exports = function (context) {
  return context.github.issues.unlock(context.payload.toIssue());
};
