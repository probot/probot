const expect = require('expect');
const Dispatcher = require('../lib/dispatcher');
const Configuration = require('../lib/configuration');
const payload = require ('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('dispatch', function () {
  let event = {event: 'issues', payload: payload};
  let github, dispatcher;

  beforeEach(function() {
    github = {
      issues: {
        createComment: createSpy().andReturn(Promise.resolve())
      }
    };
    dispatcher = new Dispatcher(github, event);
  });

  describe('reply to new issue with a comment', function() {
    const config = new Configuration({behaviors: [{on: 'issues', then: {comment: 'Hello World!'}}]});

    it('posts a coment', function() {
      return dispatcher.call(config).then(function() {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('reply to new issue with a comment', function() {
    const config = new Configuration({behaviors: [{on: 'issues.created', then: {comment: 'Hello World!'}}]});

    it('calls the action', function() {
      return dispatcher.call(config).then(function() {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('on an event with a different action', function() {
    const config = new Configuration({behaviors: [{on: 'issues.labeled', then: {comment: 'Hello World!'}}]});

    it('does not perform behavior', function() {
      return dispatcher.call(config).then(function() {
        expect(github.issues.createComment).toNotHaveBeenCalled();
      });
    });
  });
});
