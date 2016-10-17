# Configuration

_Heads up! these docs are aspirational and not implemented yet. Ideally these behaviors represent an abstract syntax tree that can eventually be turned into a propper grammar._

PRobot reads the configuration from `.probot.yml` in your repository.

```yml
behaviors:
  # Auto-respond to new issues and pull requests
  - on:
      - issues.opened
      - pull_request.opened
    then:
      comment: "Thanks for your contribution! Expect a reply within 48 hours."
      label: triage

  # Auto-close new pull requests
  - on: pull_request.opened
    then:
      comment: "Sorry @{{ user.login }}, pull requests are not accepted on this repository."
      close: true
```

## `behaviors`

Behaviors are composed of:

- [`on`](#on) - webhook events to listen to
- [`when`](#when) (optional) - conditions to determine if the actions should be performed.
- [`then`](#then) - actions to take in response to the event

### `on`

Specifies the type of GitHub [webhook event](https://developer.github.com/webhooks/#events) that this behavior applies to:

```yml
- on: issues
```

Specifying multiple events will trigger this behavior:

```yml
- on:
  - issues
  - pull_request
```

Many events also have an `action` (e.g. `created` for the `issue` event), which can be referenced with dot notation:

```yml
- on:
  - issues.labeled
  - issues.unlabeled
```

[Webhook events](https://developer.github.com/webhooks/#events) include:

- [commit_comment](https://developer.github.com/v3/activity/events/types/#commitcommentevent) - Any time a Commit is commented on.
- [create](https://developer.github.com/v3/activity/events/types/#createevent) - Any time a Branch or Tag is created.
- [delete](https://developer.github.com/v3/activity/events/types/#deleteevent) - Any time a Branch or Tag is deleted.
- [deployment](https://developer.github.com/v3/activity/events/types/#deploymentevent) - Any time a Repository has a new deployment created from the API.
- [deployment_status](https://developer.github.com/v3/activity/events/types/#deploymentstatusevent) - Any time a deployment for a Repository has a status update from the API.
- [fork](https://developer.github.com/v3/activity/events/types/#forkevent) - Any time a Repository is forked.
- [gollum](https://developer.github.com/v3/activity/events/types/#gollumevent) - Any time a Wiki page is updated.
- [issue_comment](https://developer.github.com/v3/activity/events/types/#issuecommentevent) - Any time a [comment on an issue](https://developer.github.com/v3/issues/comments/) is created, edited, or deleted.
- [issues](https://developer.github.com/v3/activity/events/types/#issuesevent) - Any time an Issue is assigned, unassigned, labeled, unlabeled, opened, edited, closed, or reopened.
- [member](https://developer.github.com/v3/activity/events/types/#memberevent) - Any time a User is added as a collaborator to a Repository.
- [membership](https://developer.github.com/v3/activity/events/types/#membershipevent) - Any time a User is added or removed from a team.Organization hooks only.
- [page_build](https://developer.github.com/v3/activity/events/types/#pagebuildevent) - Any time a Pages site is built or results in a failed build.
- [public](https://developer.github.com/v3/activity/events/types/#publicevent) - Any time a Repository changes from private to public.
- [pull_request_review_comment](https://developer.github.com/v3/activity/events/types/#pullrequestreviewcommentevent) - Any time a [comment on a Pull Request's unified diff](https://developer.github.com/v3/pulls/comments) is created, edited, or deleted (in the Files Changed tab).
- [pull_request_review](https://developer.github.com/v3/activity/events/types/#pullrequestreviewevent) - Any time a Pull Request Review is submitted.
- [pull_request](https://developer.github.com/v3/activity/events/types/#pullrequestevent) - Any time a Pull Request is assigned, unassigned, labeled, unlabeled, opened, edited, closed, reopened, or synchronized (updated due to a new push in the branch that the pull request is tracking).
- [push](https://developer.github.com/v3/activity/events/types/#pushevent) - Any Git push to a Repository, including editing tags or branches. Commits via API actions that update references are also counted. This is the default event.
- [repository](https://developer.github.com/v3/activity/events/types/#repositoryevent) - Any time a Repository is created, deleted, made public, or made private.
- [release](https://developer.github.com/v3/activity/events/types/#releaseevent) - Any time a Release is published in a Repository.
- [status](https://developer.github.com/v3/activity/events/types/#statusevent) - Any time a Repository has a status update from the API
- [team_add](https://developer.github.com/v3/activity/events/types/#teamaddevent) - Any time a team is added or modified on a Repository.
- [watch](https://developer.github.com/v3/activity/events/types/#watchevent) - Any time a User stars a Repository.

TODO: document actions

### `when`

Only preform the actions if theses conditions are met.

_Heads up! There are not any `when` conditions implemented yet. _

### `then`

#### `comment`

Comments can be posted in response to any event performed on an Issue or Pull Request. Comments use [mustache](https://mustache.github.io/) for templates and can use any data from the event payload.

```yml
- then:
    comment: >
      Hey @{{ user.login }}, thanks for the contribution!
```

#### `close`

Close an issue or pull request.

```yml
- then:
    close: true
```

#### `open`

Reopen an issue or pull request.

```yml
- then:
    open: true
```

#### `lock`

Lock conversation on an issue or pull request.

```yml
- then:
    lock: true
```

#### `unlock`

Unlock conversation on an issue or pull request.

```yml
- then:
    unlock: true
```

#### `label`

Add labels

```yml
- then:
    label: bug
```

#### `unlabel`

Add labels

```yml
- then:
    unlabel: needs-work
    label: waiting-for-review
```

#### `assign`

```yml
  then:
    assign: hubot
```

#### `unassign`

```yml
  then:
    unassign: defunkt
```

---

See [examples](examples.md) for ideas of behaviors you can implement by combining these configuration options.
