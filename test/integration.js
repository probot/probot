const expect = require('expect');
const Configuration = require('../lib/configuration');
const Context = require('../lib/context');
const payload = require('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('integration', () => {
  let context;
  let github;

  beforeEach(() => {
    const event = {event: 'issues', payload, issue: {}};
    github = {
      issues: {
        createComment: createSpy().andReturn(Promise.resolve()),
        edit: createSpy().andReturn(Promise.resolve())
      }
    };

    context = new Context(github, event);
  });

  function configure(content) {
    return new Configuration(context).parse(content);
  }

  describe('reply to new issue with a comment', () => {
    it('posts a coment', () => {
      const config = configure('on("issues").comment("Hello World!")');
      return config.execute(context).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('reply to new issue with a comment', () => {
    it('calls the action', () => {
      const config = configure('on("issues.created").comment("Hello World!")');

      return config.execute(context).then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('on an event with a different action', () => {
    it('does not perform behavior', () => {
      const config = configure('on("issues.labeled").comment("Hello World!")');

      return config.execute(context).then(() => {
        expect(github.issues.createComment).toNotHaveBeenCalled();
      });
    });
  });

  describe('filter', () => {
    beforeEach(() => {
      const labeled = require('./fixtures/webhook/issues.labeled.json');

      const event = {event: 'issues', payload: labeled, issue: {}};
      context = new Context(github, event);
    });

    it('calls action when condition matches', () => {
      const config = configure('on("issues.labeled").filter((e) => e.payload.label.name == "bug").close()');
      return config.execute(context).then(() => {
        expect(github.issues.edit).toHaveBeenCalled();
      });
    });

    it('does not call action when conditions do not match', () => {
      const config = configure('on("issues.labeled").filter((e) => e.payload.label.name == "foobar").close()');
      return config.execute(context).then(() => {
        expect(github.issues.edit).toNotHaveBeenCalled();
      });
    });
  });
});
