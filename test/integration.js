const expect = require('expect');
const Configuration = require('../lib/configuration');
const Context = require('../lib/context');
const payload = require('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

describe('integration', () => {
  const event = {event: 'issues', payload};
  let context;
  let github;

  beforeEach(() => {
    github = {
      issues: {
        createComment: createSpy().andReturn(Promise.resolve()),
        edit: createSpy().andReturn(Promise.resolve())
      },
      repos: {
        getContent: createSpy()
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

  describe('include', () => {
    let content;

    beforeEach(() => {
      content = require('./fixtures/content/probot.json');

      content.content = new Buffer('on("issues").comment("Hello!");').toString('base64');
      github.repos.getContent.andReturn(Promise.resolve(content));

      context = new Context(github, event);
    });

    it('includes a file in the local repository', () => {
      configure('include(".github/triage.js");');
      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        path: '.github/triage.js'
      });
    });

    it('executes included rules', done => {
      configure('include(".github/triage.js");').execute().then(() => {
        expect(github.issues.createComment).toHaveBeenCalled();
        done();
      });
    });

    it('includes files relative to included repository', () => {
      github.repos.getContent.andCall(params => {
        if (params.path === 'script-a.js') {
          return Promise.resolve({
            content: new Buffer('include("script-b.js")').toString('base64')
          });
        } else {
          return Promise.resolve({content: ''});
        }
      });

      const config = configure('include("other/repo:script-a.js");');

      return config.execute().then(() => {
        expect(github.repos.getContent).toHaveBeenCalledWith({
          owner: 'other',
          repo: 'repo',
          path: 'script-b.js'
        });
      });
    });
  });

  describe('contents', () => {
    it('gets content from repo', () => {
      const content = {content: new Buffer('file contents').toString('base64')};
      github.repos.getContent.andReturn(Promise.resolve(content));

      const config = configure(`
        on("issues").comment(contents(".github/ISSUE_REPLY_TEMPLATE"));
      `);

      return config.execute().then(() => {
        expect(github.issues.createComment).toHaveBeenCalledWith({
          owner: 'bkeepers-inc',
          repo: 'test',
          number: event.payload.issue.number,
          body: 'file contents'
        });
      });
    });
  });
});
