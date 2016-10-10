const expect = require('expect');
const action = require('../../lib/actions/assign');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    addAssigneesToIssue: createSpy()
  }
};

describe('action.assign', () => {
  it('assigns a user', () => {
    action(github, payload, 'bkeepers');
    expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      assignees: ['bkeepers']
    });
  });

  it('assigns multiple users', () => {
    action(github, payload, ['hello', 'world']);
    expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      assignees: ['hello', 'world']
    });
  });
});
