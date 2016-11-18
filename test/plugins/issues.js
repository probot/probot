const expect = require('expect');
const issues = require('../../lib/plugins/issues');
const Workflow = require('../../lib/workflow');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  reactions: {
    createForIssue: createSpy()
  },
  issues: {
    lock: createSpy(),
    unlock: createSpy(),
    edit: createSpy(),
    addLabels: createSpy(),
    createComment: createSpy(),
    addAssigneesToIssue: createSpy(),
    removeAssigneesFromIssue: createSpy(),
    removeLabel: createSpy()
  }
};
const context = new Context(github, {}, {payload});

describe('issues plugin', () => {
  before(() => {
    this.w = new Workflow();
    this.evaluator = new issues.Evaluator();
  });

  describe('locking', () => {
    it('locks', () => {
      this.w.lock();

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.lock).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6
      });
    });

    it('unlocks', () => {
      this.w.unlock();

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.unlock).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6
      });
    });
  });

  describe('state', () => {
    it('opens an issue', () => {
      this.w.open();

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.edit).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        state: 'open'
      });
    });
    it('closes an issue', () => {
      this.w.close();

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.edit).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        state: 'closed'
      });
    });
  });

  describe('labels', () => {
    it('adds a label', () => {
      this.w.label('hello');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.addLabels).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: ['hello']
      });
    });

    it('adds multiple labels', () => {
      this.w.label('hello', 'world');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.addLabels).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: ['hello', 'world']
      });
    });

    it('removes a single label', () => {
      this.w.unlabel('hello');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        name: 'hello'
      });
    });

    it('removes a multiple labels', () => {
      this.w.unlabel('hello', 'goodbye');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        name: 'hello'
      });

      expect(github.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        name: 'goodbye'
      });
    });
  });

  describe('comments', () => {
    it('creates a comment', () => {
      this.w.comment('Hello world!');

      Promise.all(this.evaluator.evaluate(this.w, context));
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
      this.w.assign('bkeepers');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        assignees: ['bkeepers']
      });
    });

    it('assigns multiple users', () => {
      this.w.assign('hello', 'world');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        assignees: ['hello', 'world']
      });
    });

    it('unassigns a user', () => {
      this.w.unassign('bkeepers');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: {assignees: ['bkeepers']}
      });
    });

    it('unassigns multiple users', () => {
      this.w.unassign('hello', 'world');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: {assignees: ['hello', 'world']}
      });
    });
  });

  describe('reactions', () => {
    it('react', () => {
      this.w.react('heart');

      Promise.all(this.evaluator.evaluate(this.w, context));
      expect(github.reactions.createForIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        content: 'heart'
      });
    });
  });
});
