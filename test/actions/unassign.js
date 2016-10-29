const expect = require('expect');
const action = require('../../lib/actions/unassign');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    removeAssigneesFromIssue: createSpy()
  }
};
const context = new Context(github, {}, {payload});

describe('action.unassign', () => {
  it('unassigns a user', () => {
    action(context, 'bkeepers');
    expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: {assignees: ['bkeepers']}
    });
  });

  it('unassigns multiple users', () => {
    action(context, ['hello', 'world']);
    expect(github.issues.removeAssigneesFromIssue).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: {assignees: ['hello', 'world']}
    });
  });
});
