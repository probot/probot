# HubBot

_NOTE: this REAME is aspirational, and the project name is guaranteed to change._

HubBot is a trainable robot that responds to activity on GitHub. Pre-built behaviors let you automatically welcome first-time contributors, @mention previous authors, or close stale pull requests. Write your own behaviors to add whatever behavior your project needs.

## Behaviors

- Auto-responder for new issues and pull requests
- Welcome new contributors
- High five first merge (https://github.com/nrc/highfive)
- Auto close stale PRs
- @mention `OWNERS` based on modified files
- @mention based on recent blame (e.g. https://github.com/facebook/mention-bot)
- "Based on recent activity, expect a response in X days"

## Installation

TODO

## Configuration

TODO

## Creating a behavior

```javascript
robot.on('pull', function(event) {
  robot.comment("Thanks for the pull request! We'll review it within 72 hours!");
});
```

## TODO

- [x] receive webhook
- [x] issue autoresponder
  - [x] respond with comment
  - [x] configurable message
  - [x] message template
- [x] tests
  - [x] linting
- [ ] Proper use of GitHub Integrations
- [ ] Configure Travis CI
- [ ] deploy to heroku
- [ ] proper error handling
- [ ] Write a few more behaviors
- [ ] extract behaviors to separate packages
- [ ] support multiple repositories in same org
- [ ] Document explicit extension API
- [ ] release v0.1
