const handlebars = require('handlebars');
const Evaluator = require('../evaluator');

const IssuePlugin = superclass => class extends superclass {
  comment(content) {
    this._setCommentData({content});
    return this;
  }

  assign(...assignees) {
    this._setCommentData({assignees});
    return this;
  }

  unassign(...assignees) {
    this._setCommentData({unassignees: assignees});
    return this;
  }

  label(...labels) {
    this._setCommentData({labels});
    return this;
  }

  unlabel(...labels) {
    this._setCommentData({unlabels: labels});
    return this;
  }

  lock() {
    this._setCommentData({lock: true});
    return this;
  }

  unlock() {
    this._setCommentData({unlock: true});
    return this;
  }

  open() {
    this._setCommentData({open: true});
    return this;
  }

  close() {
    this._setCommentData({close: true});
    return this;
  }

  _setCommentData(obj) {
    if (this.issueActions === undefined) {
      this.issueActions = {};
    }
    Object.assign(this.issueActions, obj);
  }
};

// This is the function that implements all of the actions configured above.
class IssueEvaluator extends Evaluator {
  evaluate(workflow, context) {
    const event = context.event;

    // Bail if no issue related actions
    if (workflow.issueActions === undefined) {
      return;
    }

    // Need to guard to make sure we are only processing events we know what to
    // do with. It might be nice to have it throw errors in a validation step
    // so that people know when that they have actions that don't match their
    // events.
    if (event.issue !== undefined && event.pull_request !== undefined) {
      return;
    }
    const promises = [];

    if (workflow.issueActions.content !== undefined) {
      const template = handlebars.compile(workflow.issueActions.content)(context.payload);

      promises.push(
        context.github.issues.createComment(context.payload.toIssue({body: template}))
      );
    }

    if (workflow.issueActions.assignees !== undefined) {
      const assignees = workflow.issueActions.assignees;
      promises.push(
        context.github.issues.addAssigneesToIssue(context.payload.toIssue({assignees}))
      );
    }

    if (workflow.issueActions.unassignees !== undefined) {
      const assignees = {assignees: workflow.issueActions.unassignees};
      promises.push(
        context.github.issues.removeAssigneesFromIssue(context.payload.toIssue({body: assignees}))
      );
    }

    if (workflow.issueActions.labels !== undefined) {
      const labels = workflow.issueActions.labels;
      promises.push(
        context.github.issues.addLabels(context.payload.toIssue({body: labels}))
      );
    }

    if (workflow.issueActions.unlabels !== undefined) {
      const labels = workflow.issueActions.unlabels;
      promises.push(
        labels.map(label => {
          return context.github.issues.removeLabel(
            context.payload.toIssue({name: label})
          );
        })
      );
    }

    if (workflow.issueActions.lock !== undefined) {
      promises.push(
        context.github.issues.lock(context.payload.toIssue({}))
      );
    }

    if (workflow.issueActions.unlock !== undefined) {
      promises.push(
        context.github.issues.unlock(context.payload.toIssue({}))
      );
    }

    if (workflow.issueActions.open !== undefined) {
      promises.push(
        context.github.issues.edit(context.payload.toIssue({state: 'open'}))
      );
    }

    if (workflow.issueActions.close !== undefined) {
      promises.push(
        context.github.issues.edit(context.payload.toIssue({state: 'closed'}))
      );
    }

    return promises;
  }
}

module.exports = {
  Plugin: IssuePlugin,
  Evaluator: IssueEvaluator
};
