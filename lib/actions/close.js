const updateIssue = require('./updateIssue');

module.exports = function (github, payload) {
  return updateIssue({state: 'closed'});
};
