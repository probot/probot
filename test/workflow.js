const expect = require('expect');
const Workflow = require('../lib/workflow');

describe('Workflow', () => {
  let context;

  beforeEach(() => {
    context = {
      event: {event: 'issues', payload: {}}
    };
  });

  describe('execute', () => {
    it('returns a resolved promise for halting functions', done => {
      const workflow = new Workflow();
      workflow.api.filter(() => false);
      expect(workflow.execute(context)).toHaveBeenResolved(done);
    });

    it('returns a rejected promise when an error is thrown', done => {
      const workflow = new Workflow();
      workflow.api.filter(() => {
        throw new Error('ooops');
      });
      expect(workflow.execute(context)).toHaveBeenRejected(done);
    });
  });
});
