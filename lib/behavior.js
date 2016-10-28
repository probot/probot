module.exports = class Behavior {
  constructor(events, conditions, actions) {
    this.events = events;
    this.conditions = conditions || [];
    this.actions = actions;
  }

  perform(github, payload) {
    return Promise.all(this.actions.map(action => {
      return action.call(github, payload);
    }));
  }
};
