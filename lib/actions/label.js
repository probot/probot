module.exports = function (context, ...labels) {
  return context.github.issues.addLabels(
    context.payload.toIssue({body: labels})
  );
};
