const expect = require('expect');
const issues = require('../../lib/plugins/issues');
const workflow = require('../../lib/workflow');
const dispatcher = require('../../lib/dispatcher');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    edit: createSpy()
  }
};
const context = new Context(github, {}, {payload});

describe('issues plugin', () => {
  describe('close', () => {
    it('closes an issue', () => {
      w = new workflow.Workflow();
      w.close()
      evaluator = new issues.Evaluator;
      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.edit).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        state: 'closed',
      });
    });
  })
})
