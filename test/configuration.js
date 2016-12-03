const expect = require('expect');
const Configuration = require('../lib/configuration');
const Context = require('../lib/context');
const content = require('./fixtures/content/probot.json');
const payload = require('./fixtures/webhook/comment.created');

const createSpy = expect.createSpy;

content.content = new Buffer(`
  on("issues.opened")
    .comment("Hello World!")
    .assign("bkeepers");

  on("issues.closed")
    .unassign("bkeepers");
`).toString('base64');

describe('Configuration', () => {
  describe('require', () => {
    let github;
    let context;

    beforeEach(() => {
      github = {
        repos: {
          getContent: createSpy().andReturn(Promise.resolve(content))
        }
      };
      context = new Context(github, {payload});
    });

    it('loads from the repo', () => {
      const config = new Configuration(context);
      return config.require('.probot.js').then(() => {
        expect(github.repos.getContent).toHaveBeenCalledWith({
          owner: 'bkeepers-inc',
          repo: 'test',
          path: '.probot.js'
        });

        expect(config.workflows.length).toEqual(2);
      });
    });
  });
});
