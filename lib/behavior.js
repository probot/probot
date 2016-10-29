module.exports = class Behavior {
  constructor(events, conditions, actions) {
    this.events = events;
    this.conditions = conditions;
    this.actions = actions;
  }

  perform(context) {
    const passes = this.conditions.every(condition => {
      return condition(context);
    });

    if (!passes) {
      return Promise.resolve();
    }

    return Promise.all(this.actions.map(action => {
      return action.call(context);
    }));
  }
};
