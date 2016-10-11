const expect = require('expect');
const action = require('../../lib/actions/comment');
const Payload = require('../../lib/payload');
const payload = new Payload(require('../fixtures/webhook/comment.created.json'));

const createSpy = expect.createSpy;

const github = {
  issues: {
    createComment: createSpy()
  }
};

describe('action.comment', () => {
  it('creates a comment', () => {
    action(github, payload, 'Hello @{{ sender.login }}!');
    expect(github.issues.createComment).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: 'Hello @bkeepers!'
    });
  });
});
