const handlebars = require('handlebars');
const Evaluator = require('../evaluator');

const IssuePlugin = superclass => class extends superclass {
  comment(comment) {
    this._setCommentData({comment});
    return this;
  }

  assign(...assignees) {
    this._setCommentData({assign: assignees});
    return this;
  }

  unassign(...assignees) {
    this._setCommentData({unassign: assignees});
    return this;
  }

  label(...labels) {
    this._setCommentData({label: labels});
    return this;
  }

  unlabel(...labels) {
    this._setCommentData({unlabel: labels});
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

  checkIfEventApplies(event) {
    return event.issue !== undefined || event.pull_request !== undefined;
  }

  comment(content) {
    const template = handlebars.compile(content)(this.payload);
    return this.github.issues.createComment(this.payload.toIssue({body: template}));
  }

  assign(assignees) {
    return this.github.issues.addAssigneesToIssue(this.payload.toIssue({assignees}));
  }

  unassign(assignees) {
    return this.github.issues.removeAssigneesFromIssue(this.payload.toIssue({body: {assignees}}));
  }

  label(labels) {
    return this.github.issues.addLabels(this.payload.toIssue({body: labels}));
  }

  unlabel(labels) {
    return labels.map(label => {
      return this.github.issues.removeLabel(
        this.payload.toIssue({name: label})
      );
    });
  }

  lock() {
    return this.github.issues.lock(this.payload.toIssue({}));
  }

  unlock() {
    return this.github.issues.unlock(this.payload.toIssue({}));
  }

  open() {
    return this.github.issues.edit(this.payload.toIssue({state: 'open'}));
  }

  close() {
    return this.github.issues.edit(this.payload.toIssue({state: 'closed'}));
  }

  pluginData(workflow) {
    return workflow.issueActions;
  }
}

module.exports = {
  Plugin: IssuePlugin,
  Evaluator: IssueEvaluator
};
