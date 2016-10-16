# PRobot

[![Join the chat at https://gitter.im/bkeepers/PRobot](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bkeepers/PRobot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

_NOTE: this README is aspirational, and the project name is guaranteed to change._

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

0. **[Install the demo integration](https://github.com/integration/probot-demo)** - note that this is very likely to go away at some point soon. It will suffice for experimenting for now, but it is for demo purposes only.
0. Add @probot as a collaborator with write access on your repository.
0. Create a `.probot.yml` file in your repository with the following contents. See [Configuring](#configuring) for more information.

        behaviors:
          - on: issues.opened
            then:
              comment: >
                Hello @{{ sender.login }}. Thanks for inviting me to your project. Read
                more about [all the things I can help you with][config]. I can't wait to
                get started!

                [config]: https://github.com/bkeepers/PRobot/blob/master/docs/configuration.md

0. Open a new issue. @probot should post a comment (you may need to refresh to see it).

## Configuring

Behaviors are configured in a file called `.probot.yml` in the repository. They are composed of 3 parts:

- `on` - webhook events to listen to
- `when` (optional) - conditions to determine if the actions should be performed
- `then` - actions to take in response to the event

Here are a few examples:

```yml
behaviors:

# Post welcome message for new contributors
- on:
    # These are the webhook event and the "action"
    # https://developer.github.com/webhooks/#events
    - issues.opened
    - pull_request.opened
  when:
    first_time_contributor: true # plugins could implement conditions like this
  then:
    # Post a comment on the issue or pull request with the template, which can
    # use variables from the webhook event.
    comment:
      from_file: .github/NEW_CONTRIBUTOR_TEMPLATE.md

# Tweet when a new release is created
- on: release.published
  then:
    tweet: "Get it while it's hot! {{ repository.name }} {{ release.name }} was just released! {{ release.html_url }}"

# Assign a reviewer issues or pull requests with a label
- on:
    - issues.opened
    - pull_request.opened
    - issues.labeled
    - pull_request.labeled
  when:
    label: security
  then:
    assign:
      random:
        from_team: security-first-responders
```

Any conceivable condition (`when`) or action (`then`) could be implemented by plugins. See [Configuration](docs/configuration.md) for more information on what behaviors can be built.
