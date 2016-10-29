const expect = require('expect');
const action = require('../../lib/actions/label');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

const github = {
  issues: {
    addLabels: createSpy()
  }
};
const context = new Context(github, {}, {payload});

describe('action.label', () => {
  it('adds a label', () => {
    action(context, 'hello');
    expect(github.issues.addLabels).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: ['hello']
    });
  });

  it('adds multiple labels', () => {
    action(context, ['hello', 'world']);
    expect(github.issues.addLabels).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: ['hello']
    });
  });
});
