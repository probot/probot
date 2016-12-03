const expect = require('expect');
const Timer = require('../lib/timer');
const Context = require('../lib/context');

const github = {
  issues: {
    getForRepo: expect.createSpy()
  }
};
const event = {};
const context = new Context(github, {}, event)

describe('Timer', () => {
  let timer;
  let issues;

  beforeEach(() => {
    timer = new Timer('day');
  });

  describe('issues', () => {
    it('sets context', () => {
      timer.api.issues().comment('Hello');
      timer.workflow.execute(context).then(() => {
        expect(context.thingy).toBe(issues);
      });
    });
  });
});

// TODO:
// - set default context for timers (based on config?)
// - allow setting current context
