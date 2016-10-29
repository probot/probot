const updateIssue = require('./update-issue');

module.exports = function (context) {
  return updateIssue(context, {state: 'closed'});
};
