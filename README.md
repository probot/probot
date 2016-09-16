# HubBot

HubBot is a trainable robot that responds to activity on GitHub. Welcome first-time contributors, close stale pull requests, or require a :+1: from at least 2 maintainers with pre-built behaviors to your project, or add whatever behavior write your own.

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
- [ ] doc all the things
- [ ] release v0.1
