const base = require('./base')

// These methods will be exposed to the sandboxed environment
let IssuePlugin = (superclass) => class extends superclass {
  comment(content) {
    this._setCommentData({content: content})
    return this;
  }

  assign(...assignees) {
    this._setCommentData({assignees: assignees})
    return this;
  }

  react(...users) {
    return this;
  }

  unassign(...users) {
    return this;
  }

  label(...labels) {
    this._setCommentData({labels: labels})
    return this;
  }

  lock() {
    return this;
  }

  close(){
    this._setCommentData({close: true})
    return this;
  }

  _setCommentData(obj) {
    if (this.issueActions === undefined) {
      this.issueActions = {}
    }
    for (var prop in obj) {
      this.issueActions[prop] = obj[prop]
    }
  }
}

// This is the function that implements all of the actions configured above.
class IssueEvaluator extends base.Evaluator {
  evaluate (workflow, context) {
    let event = context.event;

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
    let item = event.issue || event.pull_request;

    let promises = [];

    if (workflow.issueActions.content !== undefined) {
      promises.push(new Promise((resolve, reject) => {
        this.resolveData(workflow.issueActions.content, (data) => {
          context.github.issues.createComment(context.payload.toIssue({body: data}, (err, res) => {
            if (err) {
              reject();
            }else{
              resolve();
            }
          }))
        })
      }));
    }

    if (workflow.issueActions.assignees !== undefined) {
      let assignees = workflow.issueActions.assignees;
      promises.push(
        context.github.issues.addAssigneesToIssue(context.payload.toIssue({assignees: assignees}))
      );
    }

    if (workflow.issueActions.labels !== undefined) {
      let labels = workflow.issueActions.labels;
      promises.push(
        context.github.issues.addLabels(context.payload.toIssue({body: labels}))
      );
    }

    if (workflow.issueActions.close !== undefined) {
      promises.push(
        context.github.issues.edit(context.payload.toIssue({state: "closed"}))
      );
    }

    return promises;
  }
}

module.exports = {
  Plugin: IssuePlugin,
  Evaluator: IssueEvaluator
}
