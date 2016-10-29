module.exports = function (context, label) {
  return context.github.issues.addLabels(
    context.payload.toIssue({body: [].concat(label)})
  );
};
