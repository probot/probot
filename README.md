# PRobot

[![Join the chat at https://gitter.im/bkeepers/PRobot](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bkeepers/PRobot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

_**Heads up!** this README is aspirational, and the project name is guaranteed to change._

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
- [Auto-reply](https://github.com/parkr/auto-reply)
- Know of other examples? [Add them here…](../../edit/master/README.md)

Here are some behaviors that we plan to implement:

- Auto-responder for new issues and pull requests
- Welcome new contributors
- Auto close stale PRs
- @mention `OWNERS` based on modified files
- "Based on recent activity, expect a response in X days"

## Installing

_**Heads up!** The [demo integration](https://github.com/integration/probot-demo) is for demo purposes only. It is very likely to go away at some point, so please don't use it for production purposes._

0. Go to the **[demo integration](https://github.com/integration/probot-demo)**, click **Install**, and then select an organization.
0. Add @probot as a collaborator with write access on your repository.
0. Create a `.probot.yml` file in your repository with the following contents. See [Configuration](docs/configuration.md) for more information on what behaviors can be built.

        behaviors:
          - on: issues.opened
            then:
              comment: >
                Hello @{{ sender.login }}. Thanks for inviting me to your project. Read
                more about [all the things I can help you with][config]. I can't wait to
                get started!

                [config]: https://github.com/bkeepers/PRobot/blob/master/docs/configuration.md

0. Open a new issue. @probot should post a comment (you may need to refresh to see it).
