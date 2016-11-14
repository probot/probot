# Examples

_**Heads up!** these examples include configuration options that are aspirational and not implemented yet._

Here are some examples of interesting things you can do by combining these components.

### Require use of issue template

    # .github/MISSING_ISSUE_TEMPLATE_AUTOREPLY.md
    #
    # Hey @{{ sender.login }}, thanks for opening an issue. Unfortunately, you
    # are missing information from the issue template. Please open a new issue with
    # all the information from the template and it will make it easier for us to
    # help you.

    Behavior: Require use of issue template
      given issues.opened
      when @issue.body matches /### Prerequisites.*### Description.*### Steps to Reproduce.*### Versions/
      or @issue.body contains "- [ ]"
      then comment from https://github.com/atom/issue-triage/blob/master/.github/MISSING_ISSUE_TEMPLATE_AUTOREPLY.md
      and label "insufficient-info"
      and close

### Post welcome message for new contributors

    Behavior: Post welcome message for new contributors
      given issues.opened
      or pull_request.opened
      when first time contributor
      then comment from https://github.com/atom/issue-triage/blob/master/.github/MISSING_ISSUE_TEMPLATE_AUTOREPLY.md;\

### Auto-close new pull requests

    Behavior: Auto-close new pull requests
      given pull_request.opened
      then comment with "Sorry @{{ user.login }}, pull requests are not accepted on this repository."
      and close

### Close issues with no body

    Behavior: Close issues with no body
      given issues.opened
      when payload issue.body matches /^$/
      then comment with "Hey @{{ user.login }}, you didn't include a description of the problem, so we're closing this issue."

### @mention watchers when label added

    Behavior: Close issues with no body
      given *.labeled
      # TODO: figure out syntax for loading watchers from file
      then comment with "Hey {{ mentions }}, you wanted to know when the `{{ payload.label.name }}` label was added."

### Assign a reviewer for new bugs

    Behavior: Assign a reviewer for new bugs
      given pull_request.labeled
      when labeled "bug"
      then assign random from "OWNERS"

### Perform actions based on content of comments

    Behavior: assign mentioned
      given issue_comment.opened
      when @issue.body matches /^@probot assign @(\w+)$/
      then assign "{{ matches[0] }}"

    Behavior: assign mentioned
      given issue_comment.opened
      when @issue.body matches /^@probot label @(\w+)$/
      then label "{{ matches[0]}}"

### Close stale issues and pull requests

    Behavior: Close stale pull requests
      every day
      given open pull requests
      when labeled "needs-work"
      and last active more than 7 days ago
      then comment from ".github/STALE_PULL_REQUEST_TEMPLATE.md"
      and close

    Behavior: Close stale issues
      every day
      given open issues
      and last active more than 2 months ago
      then comment from ".github/STALE_ISSUE_TEMPLATE.md"
      and close

### Tweet when a new release is created

    Behavior: Tweet when a new release is created
      given release.published
      then tweet with "Get it while it's hot! {{ repository.name }} {{ release.name }} was just released! {{ release.html_url }}"

### Assign a reviewer issues or pull requests with a label

    Behavior: Assign a reviewer issues or pull requests with a label
      given issues.opened
      or pull_request.opened
      or issues.labeled
      or pull_request.labeled
      if labeled "security"
      then assign random from @github/security-first-responders
