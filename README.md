# PRobot

_NOTE: this REAME is aspirational, and the project name is guaranteed to change._

PRobot is a trainable robot that responds to activity on GitHub. It's like [Hubot](https://hubot.github.com/), but for GitHub events instead of chat messages.

Automatically welcome first-time contributors, @mention previous authors, or close stale pull requests with pre-built behaviors. Write your own behaviors to implement whatever workflow your project needs.

## Why?

Almost any workflow or process you can imagine can be added to GitHub with [webhooks](https://developer.github.com/webhooks/), the [API](https://developer.github.com/v3/), and now [Integrations](https://developer.github.com/early-access/integrations/). But adding that workflow usually involves writing a lot of code to integrate with GitHub, and a tiny bit of code to implement the behavior you want. This project aims to be a generic bot for building integrations with GitHub.

The functionality of all of these awesome bots could be ported to [behaviors](#creating-a-behavior):

- [highfive](https://github.com/servo/highfive) - GitHub hooks to provide an encouraging atmosphere for new contributors
- [Homu](https://github.com/barosl/homu) - A bot that integrates with GitHub and your favorite continuous integration service
- [mention-bot](https://github.com/facebook/mention-bot) - Automatically mention potential reviewers on pull requests.
- [PullAprove](http://pullapprove.com/)
- [LGTM](https://lgtm.co)
- Know of other examples? [Add them here…](../../edit/master/README.md)

Here are some behaviors that we plan to implement:

- Auto-responder for new issues and pull requests
- Welcome new contributors
- Auto close stale PRs
- @mention `OWNERS` based on modified files
- "Based on recent activity, expect a response in X days"

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
  - [ ] one integration, multiple installations
  - [ ] per-org installation
- [ ] Configure Travis CI
- [x] deploy to heroku
- [ ] deploy to heroku button
- [ ] proper error handling
- [ ] Write a few more behaviors
- [ ] extract behaviors to separate packages
- [ ] support multiple repositories in same org
- [ ] Document explicit extension API
  - [ ] convenience wrapper for common actions (e.g. `robot.comment`, `robot.status`)
- [ ] release v0.1
- [ ] script/simulate to simulate events on a GitHub repo
