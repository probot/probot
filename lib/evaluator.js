class Evaluator {
  evaluate(workflow, context) {
    const promises = [];

    const actions = this.pluginData(workflow);
    for (const action in actions) {
      if ({}.hasOwnProperty.call(actions, action)) {
        promises.push(this[action].call(context, actions[action]));
      }
    }

    return promises;
  }
}

module.exports = Evaluator;
