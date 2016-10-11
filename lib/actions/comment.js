const handlebars = require('handlebars');

module.exports = function (github, payload, template) {
  return github.issues.createComment(
    payload.toIssue({body: handlebars.compile(template)(payload)})
  );
};
