module.exports = class Behavior {
  constructor(events, conditions, actions) {
    this.events = events;
    this.conditions = conditions || [];
    this.actions = actions;
  }
};
