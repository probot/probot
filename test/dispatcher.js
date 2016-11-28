const expect = require('expect');
const Dispatcher = require('../lib/dispatcher');
const Configuration = require('../lib/configuration');
const payload = require('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('dispatch', () => {
  let dispatcher;
  let github;

  beforeEach(() => {
    const event = {event: 'issues', payload, issue: {}};
    github = {
      issues: {
        createComment: createSpy().andReturn(Promise.resolve()),
        edit: createSpy().andReturn(Promise.resolve()),
        getAll: createSpy().andReturn(Promise.resolve())
      }
    };
    dispatcher = new Dispatcher(github, event);
  });

  describe('reply to new issue with a comment', () => {
    it('posts a coment', () => {
      const config = Configuration.parse('on("issues").comment("Hello World!")');
      return Promise.all(dispatcher.call(config)).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('reply to new issue with a comment', () => {
    it('calls the action', () => {
      const config = Configuration.parse('on("issues.created").comment("Hello World!")');

      return Promise.all(dispatcher.call(config)).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('on an event with a different action', () => {
    it('does not perform behavior', done => {
      const config = Configuration.parse('on("issues.labeled").comment("Hello World!")');

      expect(Promise.all(dispatcher.call(config))).toHaveBeenRejected(() => {
        expect(github.issues.createComment).toNotHaveBeenCalled();
        done();
      });
    });
  });

  describe('every', () => {
    it.skip('posts a coment', () => {
      const config = Configuration.parse(`
        every('day').issues({labels: 'stale'}).close();
      `);

      return dispatcher.call(config).then(() => {
        expect(github.issues.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('filter', () => {
    beforeEach(() => {
      const labeled = require('./fixtures/webhook/issues.labeled.json');

      const event = {event: 'issues', payload: labeled, issue: {}};

      dispatcher = new Dispatcher(github, event);
    });

    it('calls action when condition matches', () => {
      const config = Configuration.parse('on("issues.labeled").filter((e) => e.payload.label.name == "bug").close()');
      return Promise.all(dispatcher.call(config)).then(() => {
        expect(github.issues.edit).toHaveBeenCalled();
      });
    });

    it('does not call action when conditions do not match', done => {
      const config = Configuration.parse('on("issues.labeled").filter((e) => e.payload.label.name == "foobar").close()');
      expect(dispatcher.call(config)[0]).toHaveBeenRejected(() => {
        expect(github.issues.edit).toNotHaveBeenCalled();
        done();
      });
    });
  });
});
