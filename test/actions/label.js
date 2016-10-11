const expect = require('expect');
const action = require('../../lib/actions/label');
const Payload = require('../../lib/payload');
const payload = new Payload(require('../fixtures/webhook/comment.created.json'));

const createSpy = expect.createSpy;

const github = {
  issues: {
    addLabels: createSpy()
  }
};

describe('action.label', () => {
  it('adds a label', () => {
    action(github, payload, 'hello');
    expect(github.issues.addLabels).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: ['hello']
    });
  });

  it('adds multiple labels', () => {
    action(github, payload, ['hello', 'world']);
    expect(github.issues.addLabels).toHaveBeenCalledWith({
      user: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      body: ['hello']
    });
  });
});
