const handlebars = require('handlebars');
const Plugin = require('../plugin');

module.exports = class Issues extends Plugin {
  comment(context, content) {
    const template = handlebars.compile(content)(context.payload);
    return context.github.issues.createComment(context.payload.toIssue({body: template}));
  }

  assign(context, ...assignees) {
    return context.github.issues.addAssigneesToIssue(context.payload.toIssue({assignees}));
  }

  unassign(context, ...assignees) {
    return context.github.issues.removeAssigneesFromIssue(context.payload.toIssue({body: {assignees}}));
  }

  label(context, ...labels) {
    return context.github.issues.addLabels(context.payload.toIssue({body: labels}));
  }

  unlabel(context, ...labels) {
    return labels.map(label => {
      return context.github.issues.removeLabel(
        context.payload.toIssue({name: label})
      );
    });
  }

  lock(context) {
    return context.github.issues.lock(context.payload.toIssue({}));
  }

  unlock(context) {
    return context.github.issues.unlock(context.payload.toIssue({}));
  }

  open(context) {
    return context.github.issues.edit(context.payload.toIssue({state: 'open'}));
  }

  close(context) {
    return context.github.issues.edit(context.payload.toIssue({state: 'closed'}));
  }
};
