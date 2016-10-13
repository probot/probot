module.exports = function (github, payload, react) {
  console.log("Sending reaction: " + react)
  return github.reactions.createForIssue(
    payload.toIssue({content: react})
  );
};
