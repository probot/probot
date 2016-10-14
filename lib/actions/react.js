
module.exports = function (github, payload, react) {
  debug("Sending reaction: " + react);
  return github.reactions.createForIssue(
    payload.toIssue({content: react})
  );
};
