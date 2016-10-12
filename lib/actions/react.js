module.exports = function (github, payload, react) {
  return github.reactions.createForIssue(
    payload.toIssue({ content: react })
  );
};
