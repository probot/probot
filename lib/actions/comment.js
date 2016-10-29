const handlebars = require('handlebars');

module.exports = function (context, template) {
  return context.github.issues.createComment(
    context.payload.toIssue({body: handlebars.compile(template)(context.payload)})
  );
};
