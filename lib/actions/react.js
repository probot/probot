module.exports = function (github, payload, react) {
  return github.reactions.createForIssue({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    content: react
  });
};
