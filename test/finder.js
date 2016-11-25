const expect = require('expect');
const Finders = require('../lib/finders');
const Context = require('../lib/context');

describe('finders', () => {
  let context;
  let github;
  const config = {};
  const event = {payload:require('./fixtures/webhook/comment.created')};

  beforeEach(() => {
    github = {
      issues: {
        getForRepo: expect.createSpy().andReturn(Promise.resolve(require('./fixtures/issues')))
      }
    };

    context = new Context(github, config, event);
  });

  it('works', () => {
    return new Finders().issues(context, {labels:'bug'}).then(() => {
      expect(github.issues.getForRepo).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        labels: 'bug'
      });
    });
  });
});
