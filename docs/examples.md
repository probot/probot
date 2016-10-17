# Examples

_**Heads up!** these examples include configuration options that are aspirational and not implemented yet._

Here are some examples of interesting things you can do by combining these components.

```yml
behaviors:
  # Post welcome message for new contributors
  - on:
      - issues.opened
      - pull_request.opened
    when:
      first_time_contributor: true # plugins could implement conditions like this
    then:
      comment:
        from_file: .github/NEW_CONTRIBUTOR_TEMPLATE.md

  # Auto-close new pull requests
  - on:
      - pull_request.opened
    then:
      comment: "Sorry @{{ user.login }}, pull requests are not accepted on this repository."
      close: true

  # Close issues with no body
  - on:
      - issues.opened
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
  - on: pull_request.labeled
  - when:
      - labeled: bug
    then:
      - assign:
          random:
            from_file: OWNERS

  # Perform actions based on content of comments
  - on: issue_comment.opened
    when:
      payload:
        issue.body:
          matches: /^@probot assign @(\w+)$/
    then:
      assign: {{ matches[0] }}
  - on: issue_comment.opened
    when:
      payload:
        issue.body:
          matches: /^@probot label @(\w+)$/
    then:
      label: {{ matches[0] }}

  # Close stale issues and pull requests
  - on: *.labeled
    when:
      label: needs-work
      state: open
    then:
      delay:
        after: 7 days
        close: true

  # Label state transitions
  # TODO

  # Apply label based on changed files
  # TODO
```
