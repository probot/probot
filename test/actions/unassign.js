const expect = require('expect');
const action = require('../../lib/actions/unassign');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    removeAssigneesFromIssue: createSpy()
  }
};

describe('action.unassign', () => {
  it('unassigns a user', () => {
    action(github, payload, 'bkeepers');
    expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: ['bkeepers']
    });
  });

  it('unassigns multiple users', () => {
    action(github, payload, ['hello', 'world']);
    expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: ['hello', 'world']
    });
  });
});
