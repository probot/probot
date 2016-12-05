const handlebars = require('handlebars');
const Plugin = require('../plugin');

module.exports = class Issues extends Plugin {
  comment(context, content) {
    const template = handlebars.compile(content)(context.payload);
    return context.github.issues.createComment(context.toIssue({body: template}));
  }

  assign(context, ...assignees) {
    return context.github.issues.addAssigneesToIssue(context.toIssue({assignees}));
  }

  unassign(context, ...assignees) {
    return context.github.issues.removeAssigneesFromIssue(context.toIssue({body: {assignees}}));
  }

  label(context, ...labels) {
    return context.github.issues.addLabels(context.toIssue({body: labels}));
  }

  unlabel(context, ...labels) {
    return labels.map(label => {
      return context.github.issues.removeLabel(
        context.toIssue({name: label})
      );
    });
  }

  lock(context) {
    return context.github.issues.lock(context.toIssue({}));
  }

  unlock(context) {
    return context.github.issues.unlock(context.toIssue({}));
  }

  open(context) {
    return context.github.issues.edit(context.toIssue({state: 'open'}));
  }

  close(context) {
    return context.github.issues.edit(context.toIssue({state: 'closed'}));
  }

  deleteComment(context) {
    return context.github.issues.deleteComment(
      context.toRepo({id: context.payload.comment.id})
    );
  }
};
