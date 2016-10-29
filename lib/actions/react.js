
module.exports = function (context, react) {
  return context.github.reactions.createForIssue(
    context.payload.toIssue({content: react})
  );
};
