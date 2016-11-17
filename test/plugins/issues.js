const expect = require('expect');
const issues = require('../../lib/plugins/issues');
const workflow = require('../../lib/workflow');
const dispatcher = require('../../lib/dispatcher');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    edit: createSpy(),
    addLabels: createSpy(),
  }
};
const context = new Context(github, {}, {payload});

describe('issues plugin', () => {
  before( () => {
    w = new workflow.Workflow();
    evaluator = new issues.Evaluator;
  })
  describe('closing', () => {
    it('closes an issue', () => {
      w.close()

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.edit).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        state: 'closed',
      });
    });
  })

  describe('labels', () => {
    it('adds a label', () => {
      w.label('hello');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.addLabels).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: ['hello']
      });
    });

    it('adds multiple labels', () => {
      w.label('hello', 'world');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.addLabels).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: ['hello', 'world']
      });
    });
  });
})
