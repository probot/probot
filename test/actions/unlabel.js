const expect = require('expect');
const action = require('../../lib/actions/unlabel');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    removeLabel: createSpy()
  }
};
const context = new Context(github, {}, {payload});

describe('action.unlabel', () => {
  it('removes a single label', () => {
    action(context, 'hello');
    expect(github.issues.removeLabel).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      name: 'hello'
    });
  });

  it('removes a multiple labels', () => {
    action(context, ['hello', 'goodbye']);
    expect(github.issues.removeLabel).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      name: 'hello'
    });

    expect(github.issues.removeLabel).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      name: 'goodbye'
    });
  });
});
