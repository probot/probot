const base = require('./base')

// These methods will be exposed to the sandboxed environment
let IssuePlugin = (superclass) => class extends superclass {
  comment(content) {
    this._setCommentData({content: content})
    return this;
  }

  label(...labels) {
    this._setCommentData({labels: labels})
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

    console.log("Issue "+item.id+":")

    // TODO: We should probably chain promises here
    if (workflow.issueActions.content !== undefined) {
      this.resolveData(workflow.issueActions.content, () => {
        console.log("Commenting '"+workflow.issueActions.content+"'")
      })
    }

    if (workflow.issueActions.labels !== undefined) {
      console.log("Labeling with: "+workflow.issueActions.labels)
    }

    if (workflow.issueActions.content !== undefined) {
      console.log("Closing")
    }
  }
}

module.exports = {
  Plugin: IssuePlugin,
  Evaluator: IssueEvaluator
}
