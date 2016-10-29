const expect = require('expect');
const action = require('../../lib/actions/assign');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    addAssigneesToIssue: createSpy()
  }
};

const context = new Context(github, {}, {payload});

describe('action.assign', () => {
  it('assigns a user', () => {
    action(context, 'bkeepers');
    expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      assignees: ['bkeepers']
    });
  });

  it('assigns multiple users', () => {
    action(context, ['hello', 'world']);
    expect(github.issues.addAssigneesToIssue).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      assignees: ['hello', 'world']
    });
  });
});
