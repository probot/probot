const expect = require('expect');
const action = require('../../lib/actions/comment');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    createComment: createSpy()
  }
};

describe('action.comment', () => {
  it('creates a comment', () => {
    const context = new Context(github, {}, {payload});
    action(context, 'Hello @{{ sender.login }}!');
    expect(github.issues.createComment).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: 'Hello @bkeepers!'
    });
  });
});
