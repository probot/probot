module.exports = function (github, payload, label) {
  return github.issues.addLabels(
    payload.toIssue({body: [].concat(label)})
  );
};
