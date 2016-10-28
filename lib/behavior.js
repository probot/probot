module.exports = class Behavior {
  constructor(events, conditions, actions) {
    this.on = events;
    this.conditions = conditions || [];
    this.then = actions;
  }
}
