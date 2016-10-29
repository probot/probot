module.exports = class Behavior {
  constructor(events, conditions, actions) {
    this.events = events;
    this.conditions = conditions;
    this.actions = actions;
  }

  perform(context) {
    if (this.conditions && !this.conditions(context)) {
      return Promise.resolve();
    }

    return Promise.all(this.actions.map(action => {
      return action(context);
    }));
  }
};
