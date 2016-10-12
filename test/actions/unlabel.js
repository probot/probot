const expect = require('expect');
const action = require('../../lib/actions/unlabel');
const Payload = require('../../lib/payload');
const payload = new Payload(require('../fixtures/webhook/comment.created.json'));

const createSpy = expect.createSpy;

const github = {
  issues: {
    removeLabel: createSpy()
  }
};

describe('action.unlabel', () => {
  it('removes a single label', () => {
    action(github, payload, 'hello');
    expect(github.issues.removeLabel).toHaveBeenCalledWith({
      owner: 'bkeepers-inc',
      repo: 'test',
      number: 6,
      name: 'hello'
    });
  });

  it('removes a multiple labels', () => {
    action(github, payload, ['hello', 'goodbye']);
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
