module.exports = function (github, payload) {
  return github.issues.lock({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number
  });
};
