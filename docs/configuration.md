# Configuration

_Heads up! these docs are aspirational and not implemented yet. Ideally these behaviors represent an abstract syntax tree that can eventually be turned into a propper grammar._

PRobot reads the configuration from `.probot.yml` in your repository.

```yml
behaviors:
  # Auto-respond to new issues and pull requests
  - on:
      - issue.created
      - pull_request.created
    then:
      comment: "Thanks for your contribution! Expect a reply within 48 hours."
      label: triage

  # Auto-close new pull requests
  - on: pull_request.created
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

Specifies the type of GitHub [webhook event](https://developer.github.com/webhooks/#events) that this behavior applies to.

```yml
- on: issue.create
```

Specifying multiple events will trigger this behavior:

```yml
- on:
  - issue
  - pull_request
```

Many events also have an `action` (e.g. `created` for the `issue` event), which can be referenced with dot notation:

```yml
- on:
  - issue.labeled
  - issue.unlabeled
```

### `when`

Only preform the actions if theses conditions are met.

#### `payload`

Filter by attributes of the payload.

```
- when:
    payload:
      "sender.login": "bkeepers"
      "issue.title":
        contains: "[WIP]"
      "issue.body":
        matches: /^$/
      "issue.labels"
        contains: "bug"
```

#### Extensions

Conditions can be added via extensions.

### `then`

#### `comment`

Comments can be posted in response to any event performed on an Issue or Pull Request. Comments use [mustache](https://mustache.github.io/) for templates and can use any data from the event payload.

```yml
- then:
    comment: "Hey @{{ user.login }}, thanks for the contribution!"
```

The content of the comment can come from a file in the repository.

```yml
- then:
    comment:
      from_file: ".github/REPLY_TEMPLATE.md"
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

#### `merge`

Close an issue or pull request.

```yml
- then:
    close: true
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
- then:
    assign: hubot
```

#### `unassign`

```yml
- then:
    unassign: defunkt
```

### `inherit_from`

Inherit configuration from another repository.

```yml
inherit_from: kubernetes/probot
behaviors:
  # other behaviors
```

Inherit from multiple repositories:

```yml
inherit_from:
  - kubernetes/probot
  - github/probot
```

## Examples

Here are some examples of interesting things you can do by combining these components.

```yml
behaviors:
  # Post welcome message for new contributors
  - on:
      - issue.created
      - pull_request.created
    when:
      first_time_contributor: true # plugins could implement conditions like this
    then:
      comment:
        from_file: .github/NEW_CONTRIBUTOR_TEMPLATE.md

  # Auto-close new pull requests
  - on:
      - pull_request.created
    then:
      comment: "Sorry @{{ user.login }}, pull requests are not accepted on this repository."
      close: true

  # Close issues with no body
  - on:
      - issue.created
    when:
      payload:
        body:
          matches: /^$/
    then:
      comment: "Hey @{{ user.login }}, you didn't include a description of the problem, so we're closing this issue."

  # @mention watchers when label added
  - on: *.labeled
    then:
      comment:
        # TODO: figure out syntax for loading watchers from file
        message: "Hey {{ mentions }}, you wanted to know when the `{{ payload.label.name }}` label was added."

  # Assign a reviewer for new bugs
  - when:
      - labeled: bug
    then:
      - assign:
          random:
            from_file: OWNERS

  # Label state transitions
  # TODO

  # Apply label based on changed files
  # TODO
```
