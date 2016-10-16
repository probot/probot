// NOTE: The reactions API is not yet available for Integrations, so this action
//       does not currently work.
// https://developer.github.com/early-access/integrations/available-endpoints/
module.exports = function (github, payload, react) {
  return github.reactions.createForIssue(
    payload.toIssue({content: react})
  );
};
