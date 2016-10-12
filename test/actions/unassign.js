const expect = require('expect');
const action = require('../../lib/actions/unassign');
const Payload = require('../../lib/payload');
const payload = new Payload(require('../fixtures/webhook/comment.created.json'));

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
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: {assignees: ['bkeepers']}
    });
  });

  it('unassigns multiple users', () => {
    action(github, payload, ['hello', 'world']);
    expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: {assignees: ['hello', 'world']}
    });
  });
});
