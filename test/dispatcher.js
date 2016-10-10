const expect = require('expect');
const GitHubApi = require('github');
const Dispatcher = require('../lib/dispatcher');
const payload = require ('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    createComment: createSpy().andReturn(Promise.resolve())
  }
};
const event = {event: 'issues', payload: payload};
const dispatcher = new Dispatcher(github, event);

describe('dispatch', function () {
  describe('reply to new issue with a comment', function() {
    const config = {behaviors: [{on: 'issues', then: {comment: 'Hello World!'}}]};

    it('posts a coment', function() {
      return dispatcher.call(config).then(function() {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('reply to new issue with a comment', function() {
    const config = {behaviors: [{on: 'issues.created', then: {comment: 'Hello World!'}}]};

    it('posts a coment', function() {
      return dispatcher.call(config).then(function() {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });
});
