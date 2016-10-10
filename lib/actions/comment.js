const handlebars = require('handlebars');

module.exports = function (github, payload, template) {
  return github.issues.createComment({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    body: handlebars.compile(template)(payload)
  });
};
