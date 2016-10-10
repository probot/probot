const expect = require('expect');
const Dispatcher = require('../lib/dispatcher');
const Configuration = require('../lib/configuration');
const payload = require('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('dispatch', () => {
  const event = {event: 'issues', payload};
  let github;
  let dispatcher;

  beforeEach(() => {
    github = {
      issues: {
        createComment: createSpy().andReturn(Promise.resolve())
      }
    };
    dispatcher = new Dispatcher(github, event);
  });

  describe('reply to new issue with a comment', () => {
    const config = new Configuration({behaviors: [{on: 'issues', then: {comment: 'Hello World!'}}]});

    it('posts a coment', () => {
      return dispatcher.call(config).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('reply to new issue with a comment', () => {
    const config = new Configuration({behaviors: [{on: 'issues.created', then: {comment: 'Hello World!'}}]});

    it('calls the action', () => {
      return dispatcher.call(config).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('on an event with a different action', () => {
    const config = new Configuration({behaviors: [{on: 'issues.labeled', then: {comment: 'Hello World!'}}]});

    it('does not perform behavior', () => {
      return dispatcher.call(config).then(() => {
        expect(github.issues.createComment).toNotHaveBeenCalled();
      });
    });
  });
});
