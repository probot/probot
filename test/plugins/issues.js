const expect = require('expect');
const Issues = require('../../lib/plugins/issues');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('issues plugin', () => {
  let context;
  let github;

  before(() => {
    github = {
      issues: {
        lock: createSpy(),
        unlock: createSpy(),
        edit: createSpy(),
        addLabels: createSpy(),
        createComment: createSpy(),
        addAssigneesToIssue: createSpy(),
        removeAssigneesFromIssue: createSpy(),
        removeLabel: createSpy(),
        deleteComment: createSpy(),
        create: createSpy()
      },
      repos: {
        deleteCommitComment: createSpy()
      },
      pullRequests: {
        deleteComment: createSpy()
      }
    };
    context = new Context(github, {payload});
    this.issues = new Issues();
  });

  describe('locking', () => {
    it('locks', () => {
      this.issues.lock(context);

      expect(github.issues.lock).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6
      });
    });

    it('unlocks', () => {
      this.issues.unlock(context);

      expect(github.issues.unlock).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6
      });
    });
  });

  describe('state', () => {
    it('opens an issue', () => {
      this.issues.open(context);

      expect(github.issues.edit).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        state: 'open'
      });
    });
    it('closes an issue', () => {
      this.issues.close(context);

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
      this.issues.label(context, 'hello');

      expect(github.issues.addLabels).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: ['hello']
      });
    });

    it('adds multiple labels', () => {
      this.issues.label(context, 'hello', 'world');

      expect(github.issues.addLabels).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: ['hello', 'world']
      });
    });

    it('removes a single label', () => {
      this.issues.unlabel(context, 'hello');

      expect(github.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        name: 'hello'
      });
    });

    it('removes a multiple labels', () => {
      this.issues.unlabel(context, 'hello', 'goodbye');

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
      this.issues.comment(context, 'Hello world!');

      expect(github.issues.createComment).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: 'Hello world!'
      });
    });

    it('evaluates templates with handlebars', () => {
      this.issues.comment(context, 'Hello @{{ sender.login }}!');

      expect(github.issues.createComment).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: 'Hello @bkeepers!'
      });
    });
  });

  describe('assignment', () => {
    it('assigns a user', () => {
      this.issues.assign(context, 'bkeepers');

      expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        assignees: ['bkeepers']
      });
    });

    it('assigns multiple users', () => {
      this.issues.assign(context, 'hello', 'world');

      expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        assignees: ['hello', 'world']
      });
    });

    it('unassigns a user', () => {
      this.issues.unassign(context, 'bkeepers');

      expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: {assignees: ['bkeepers']}
      });
    });

    it('unassigns multiple users', () => {
      this.issues.unassign(context, 'hello', 'world');

      expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        number: 6,
        body: {assignees: ['hello', 'world']}
      });
    });
  });

  describe('deleteComment', () => {
    it('deletes an issue comment', () => {
      this.issues.deleteComment(context);

      expect(github.issues.deleteComment).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        id: 252508381
      });
    });

    it('deletes a commit comment', () => {
      const payload = require('../fixtures/webhook/commit_comment.created');

      context = new Context(github, {payload});
      this.issues.deleteComment(context);

      expect(github.repos.deleteCommitComment).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        id: 20067099
      });
    });

    it('deletes a PR comment', () => {
      const payload = require('../fixtures/webhook/pull_request_review_comment.created');

      context = new Context(github, {payload});
      this.issues.deleteComment(context);

      expect(github.pullRequests.deleteComment).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        id: 90805181
      });
    });
  });

  describe('createIssue', () => {
    it('creates an issue', () => {
      return this.issues.createIssue(context, {title: 'testing', body: 'body'}).then(() => {
        expect(github.issues.create).toHaveBeenCalledWith({
          owner: 'bkeepers-inc',
          repo: 'test',
          title: 'testing',
          body: 'body',
          assignees: undefined,
          labels: undefined
        });
      });
    });

    it('resolves body content', () => {
      return this.issues.createIssue(context, {title: 'testing', body: Promise.resolve('body')}).then(() => {
        expect(github.issues.create).toHaveBeenCalledWith({
          owner: 'bkeepers-inc',
          repo: 'test',
          title: 'testing',
          body: 'body',
          assignees: undefined,
          labels: undefined
        });
      });
    });

    it('sets optional parameters', () => {
      return this.issues.createIssue(context, {title: 'testing', body: 'body', assignees: ['bkeepers'], labels: ['hello']}).then(() => {
        expect(github.issues.create).toHaveBeenCalledWith({
          owner: 'bkeepers-inc',
          repo: 'test',
          title: 'testing',
          body: 'body',
          assignees: ['bkeepers'],
          labels: ['hello']
        });
      });
    });
  });
});
