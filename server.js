let process = require('process');
let http = require('http');
let createHandler = require('github-webhook-handler');
let webhook = createHandler({ path: '/', secret: 'secret' });
let GitHubApi = require('github');
let github = new GitHubApi();

github.authenticate({
  type: 'oauth',
  token: process.env['GITHUB_TOKEN']
});

http.createServer(function (req, res) {
  webhook(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location')
  })
}).listen(3000);

// Auto-responder behavior
let handlebars = require('handlebars');

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
