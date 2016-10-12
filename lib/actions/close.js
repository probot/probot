const updateIssue = require('./update-issue');

module.exports = function (github, payload) {
  return updateIssue(github, payload, {state: 'closed'});
};
