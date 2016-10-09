const expect = require('expect');
const autoresponder = require('../behaviors/autoresponder');
const issueEvent = require('./fixtures/issues.json');
const issueReplyTemplate = require('./fixtures/content/issue_reply_template.json');

const createSpy = expect.createSpy;

const github = {
  repos: {
    getContent: createSpy().andCall((data, callback) => {
      callback(null, issueReplyTemplate);
    })
  },
  issues: {
    createComment: createSpy()
  }
};

describe('autoresponder', () => {
  it('gets reply template from the repo', () => {
    autoresponder.action(issueEvent, github);

    expect(github.repos.getContent.calls[0].arguments[0]).toEqual({
      user: 'bkeepers-inc',
      repo: 'botland',
      path: '.github/ISSUE_REPLY_TEMPLATE.md'
    });
  });

  it('posts a comment based on the template', () => {
    autoresponder.action(issueEvent, github);

    expect(github.issues.createComment.calls[0].arguments[0]).toEqual({
      user: 'bkeepers-inc',
      repo: 'botland',
      number: 1,
      body: 'Hello there, @bkeepers!\n'
    });
  });
});
