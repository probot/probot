const expect = require('expect');
const GitHubApi = require('github');
const dispatch = require('../lib/dispatch');
const content = require('./fixtures/content/probot.yml.json');
const payload = require ('./fixtures/webhook/comment.created.json');

const createSpy = expect.createSpy;

var github = {
  repos: {
    getContent: createSpy().andReturn(Promise.resolve(content))
  },
  issues: {
    createComment: createSpy().andReturn(Promise.resolve())
  }
};

describe('dispatch', function () {
  // lazy end-to-end test
  it('works', function (done) {
    dispatch(github, {event: 'issues', payload: payload}).then(() => {
      expect(github.issues.createComment).toHaveBeenCalled();
      done();
    });
  });
});
