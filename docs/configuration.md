# Configuration

Workflows are configured in a file called `.probot.js` in your repository.

```js
// Auto-respond to new issues and pull requests
on('issues.opened', 'pull_request.opened')
  .comment('Thanks for your contribution! Expect a reply within 48 hours.')
  .label('triage');

// Auto-close new pull requests
on('pull_request.opened')
  .comment('Sorry @{{ user.login }}, pull requests are not accepted on this repository.')
  .close();
```

## Workflows

Workflows are composed of:

- [`on`](#on) - webhook events to listen to
- [`filter`](#filter) (optional) - conditions to determine if the actions should be performed.
- actions to take in response to the event

### `on`

Specifies the type of GitHub [webhook event](https://developer.github.com/webhooks/#events) that this behavior applies to:

```js
on('issues')
```

You can also specify multiple events to trigger this behavior:

```js
on('issues', 'pull_request')
```

Many events also have an `action` (e.g. `created` for the `issue` event), which can be referenced with dot notation:

```js
on('issues.labeled', 'issues.unlabeled')
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

### `filter`

Only preform the actions if the function returns `true`. The `event` is passed as an argument to the function and attributes of the [webhook payload](https://developer.github.com/webhooks/#events).

```js
.filter(event => event.payload.issue.body.includes('- [ ]'))
```

### `comment`

Comments can be posted in response to any event performed on an Issue or Pull Request. Comments use [mustache](https://mustache.github.io/) for templates and can use any data from the event payload.

```js
.comment('Hey @{{ user.login }}, thanks for the contribution!');
```

### `deleteComment`

Deletes the comment for the `issue_comment`, `commit_comment`, and `pull_request_review_comment` events.

```js
.deleteComment();
```

### `close`

Close an issue or pull request.

```js
.close();
```

### `open`

Reopen an issue or pull request.

```js
.open();
```

### `lock`

Lock conversation on an issue or pull request.

```js
.lock();
```

### `unlock`

Unlock conversation on an issue or pull request.

```js
.unlock();
```

### `label`

Add labels

```js
.label('bug');
```

### `unlabel`

Add labels

```js
.unlabel('needs-work').label('waiting-for-review');
```

### `assign`

```js
.assign('hubot');
```

### `unassign`

```js
.unassign('defunkt');
```

### `createIssue`

Create a new issue defined as a JSON Object. The `title` and `body` fields are required.

```js
.createIssue({
  title: 'Issue Title',
  body: 'Issue Body',
  assignees: ['bkeepers']
  labels: ['question']
});
```

The `body` of the issue can be generated from the contents of a template file within the repository by invoking the `contents` function.

```js
.createIssue({
  title: 'Issue Title',
  body: contents('.github/NEW_ISSUE_TEMPLATE.md'),
  assignees: ['bkeepers'],
  labels: ['question']
});
```

## include

Loads a configuration from another file.

```js
include('.github/bot/issues.js');
include('.github/bot/releases.js');
```

You can also include configuration from another repository.

```js
include('user/repo:path.js#branch');
```

## contents

Retrieves the contents of the repository and passes them to any plugin method.

```js
on('issues.opened').comment(contents('.github/NEW_ISSUE_TEMPLATE.md'));
```
This also supports fetching contents from another repository

```js
on('issues.opened').comment(contents('atom/configs:.github/NEW_ISSUE_TEMPLATE.md'));
```

---

See [examples](examples.md) for ideas of behaviors you can implement by combining these configuration options.
