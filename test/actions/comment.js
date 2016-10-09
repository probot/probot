const expect = require('expect');
const action = require('../../lib/actions/comment');
const createSpy = expect.createSpy;
const payload = require('../fixtures/webhook/comment.created.json');

const github = {
  issues: {
    createComment: createSpy()
  }
};

describe('action.comment', function () {
  it('creates a comment', function() {
    action(github, payload, "Hello @{{ sender.login }}!");
    expect(github.issues.createComment).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: 'Hello @bkeepers!'
    });
  });
});
