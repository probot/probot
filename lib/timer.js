const Workflow = require('./workflow');

const INTERVALS = {
  second: 1000,
  minute: 1000 * 60,
  hour:   1000 * 60 * 60,
  day:    1000 * 60 * 60 * 24,
  week:   1000 * 60 * 60 * 24 * 7
}

module.exports = class Timer {
  constructor(interval, callback) {
    this.interval = INTERVALS[interval];
    this.callback = callback;

    if (!this.interval) {
      throw new Error('Unkown interval: ' + interval);
    }
    this.workflow = new Workflow();

    this.api = {
      issues: this.issues.bind(this)
    };
  }

  issues(options) {
    return this.workflow;
  }

  schedule() {
    console.log("scheduling", this.interval);
    setInterval(this.execute.bind(this), this.interval);
  }

  execute() {
    this.callback.call(this.callback, this.api);
  }
}
