module.exports = class Behavior {
  constructor(events, conditions, actions) {
    this.events = events;
    this.conditions = conditions;
    this.actions = actions;
  }

  perform(github, payload) {
    const passes = this.conditions.every(condition => {
      return condition.matches(github, payload);
    });

    if (!passes) {
      return Promise.resolve();
    }

    return Promise.all(this.actions.map(action => {
      return action.call(github, payload);
    }));
  }
};
