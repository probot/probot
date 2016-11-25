const expect = require('expect');
const Timer = require('../lib/timer');

describe('Timer', () => {
  let timer;
  let issues;

  beforeEach(() => {
    timer = new Timer('day');
  });

  describe('issues', () => {
    it.skip('sets context', () => {
      timer.api.issues().comment('Hello');
      timer.workflow.execute(context).then(() => {
        expect(context.thingy).toBe(issues);
      });
    });
  });
});
