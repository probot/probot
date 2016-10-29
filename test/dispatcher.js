const expect = require('expect');
const Dispatcher = require('../lib/dispatcher');
const Configuration = require('../lib/configuration');
const payload = require('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('dispatch', () => {
  let dispatcher;
  let github;

  beforeEach(() => {
    const event = {event: 'issues', payload};
    github = {
      issues: {
        createComment: createSpy().andReturn(Promise.resolve()),
        edit: createSpy().andReturn(Promise.resolve())
      }
    };
    dispatcher = new Dispatcher(github, event);
  });

  describe('reply to new issue with a comment', () => {
    it('posts a coment', () => {
      const config = Configuration.parse('on issues then comment("Hello World!");');
      return dispatcher.call(config).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('reply to new issue with a comment', () => {
    it('calls the action', () => {
      const config = Configuration.parse('on issues.created then comment("Hello World!");');

      return dispatcher.call(config).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('on an event with a different action', () => {
    it('does not perform behavior', () => {
      const config = Configuration.parse('on issues.labeled then comment("Hello World!");');

      return dispatcher.call(config).then(() => {
        expect(github.issues.createComment).toNotHaveBeenCalled();
      });
    });
  });

  describe('conditions', () => {
    beforeEach(() => {
      const labeled = require('./fixtures/webhook/issues.labeled.json');

      const event = {event: 'issues', payload: labeled};

      dispatcher = new Dispatcher(github, event);
    });

    it('fails for unknown conditions', () => {
      const config = Configuration.parse(`on issues.labeled if failwhale(bug) then close;`);
      expect(() => dispatcher.call(config)).toThrow(/unknown condition/i);
    });

    it('calls action when condition matches', () => {
      const config = Configuration.parse(`on issues.labeled if labeled(bug) then close;`);
      return dispatcher.call(config).then(() => {
        expect(github.issues.edit).toHaveBeenCalled();
      });
    });

    it('does not call action when conditions do not match', () => {
      const config = Configuration.parse(`on issues.labeled if labeled(foobar) then close;`);
      return dispatcher.call(config).then(() => {
        expect(github.issues.edit).toNotHaveBeenCalled();
      });
    });

    it('supports logical expressions', () => {
      const config = Configuration.parse(`
        on issues.labeled
        if labeled(bug) or labeled(feature)
        then close;
      `);

      return dispatcher.call(config).then(() => {
        expect(github.issues.edit).toHaveBeenCalled();
      });
    });
  });
});
