// Auto-responder - Automatically respond to newly created issues
//
// Posts a comment on newly created issues using the contents of
// `.github/ISSUE_REPLY_TEMPLATE.md`. The template uses
// [handlebars](http://handlebarsjs.com) and use any data from the
// [issue webhook](https://developer.github.com/v3/activity/events/types/#issuesevent).
//
//     Hello there, @{{sender.author}}! Thanks for opening an issue. We'll
//     review this as soon as we can.
//

let handlebars = require('handlebars');

module.exports = function(webhook, github) {
  webhook.on('issues', function (event) {
    var payload = event['payload'],
        user = payload['repository']["owner"]["login"],
        repo = payload["repository"]["name"];

    // Get template from the repo
    github.repos.getContent({
      user: user,
      repo: repo,
      path: '.github/ISSUE_REPLY_TEMPLATE.md'
    }, function(err, data) {
      var template = handlebars.compile(new Buffer(data['content'], 'base64').toString());

      // Post issue comment
      github.issues.createComment({
        user: user,
        repo: repo,
        number: payload['issue']['number'],
        body: template(payload)
      }, function(err, res) {
        if(err) {
          console.log('ERROR', err, res);
        }
      });
    });
  });
}
