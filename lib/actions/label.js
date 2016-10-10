module.exports = function (github, payload, label) {
  return github.issues.addLabels({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    body: [].concat(label)
  });
};
