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
    createComment: createSpy(),
    addAssigneesToIssue: createSpy(),
    removeAssigneesFromIssue: createSpy(),
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

  describe('comments', () => {
    it('creates a comment', () => {
      w.comment('Hello world!');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.createComment).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: 'Hello world!'
      });
    });
  });

  describe('assignment', () => {
    it('assigns a user', () => {
      w.assign('bkeepers');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        assignees: ['bkeepers']
      });
    });

    it('assigns multiple users', () => {
      w.assign('hello', 'world');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        assignees: ['hello', 'world']
      });
    });

    it('unassigns a user', () => {
      w.unassign('bkeepers');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: {assignees: ['bkeepers']}
      });
    });

    it('unassigns multiple users', () => {
      w.unassign('hello', 'world');

      Promise.all(evaluator.evaluate(w, context));
      expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: {assignees: ['hello', 'world']}
      });
    });
  });
})
