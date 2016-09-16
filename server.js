let process = require('process');
let http = require('http');
let createHandler = require('github-webhook-handler');
let webhook = createHandler({ path: '/', secret: 'secret' });
let GitHubApi = require("github");
let github = new GitHubApi();

github.authenticate({
  type: "oauth",
  token: process.env['GITHUB_TOKEN']
});

http.createServer(function (req, res) {
  webhook(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location')
  })
}).listen(3000);

webhook.on('issues', function (event) {
  var payload = event["payload"];

  github.issues.createComment({
    user: payload["repository"]["owner"]["login"],
    repo: payload["repository"]["name"],
    number: payload["issue"]["number"],
    body: "Hello world!"
  }, function(err, res) {
    if(err) {
      console.log("ERROR", err, res);
    }
  });
});
