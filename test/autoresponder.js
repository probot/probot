var expect = require('expect');
var createSpy = expect.createSpy;
var autoresponder = require('../behaviors/autoresponder');
var issueEvent = require('./fixtures/issues.json');
var issueReplyTemplate = require('./fixtures/content/issue_reply_template.json');

var github = {
  repos: {
    getContent: createSpy().andCall(function(data, callback) {
      callback(null, issueReplyTemplate)
    })
  },
  issues: {
    createComment: createSpy()
  }
};

describe('autoresponder', function() {
  it('gets reply template from the repo', function() {
    autoresponder.action(issueEvent, github);

    expect(github.repos.getContent.calls[0].arguments[0]).toEqual({
      user: "bkeepers-inc",
      repo: "botland",
      path: ".github/ISSUE_REPLY_TEMPLATE.md"
    });
  })

  it('posts a comment based on the template', function() {
    autoresponder.action(issueEvent, github);

    expect(github.issues.createComment.calls[0].arguments[0]).toEqual({
      user: 'bkeepers-inc',
      repo: 'botland',
      number: 1,
      body: 'Hello there, @bkeepers!\n'
    });
  });
});
