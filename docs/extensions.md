---
next: docs/configuration.md
---

# Extensions

While Probot doesn't have an official extension API (yet), there are a handful of reusable utilities that have been extracted from existing apps.

## Config

[probot-config](https://github.com/getsentry/probot-config) is an extension for sharing configs between repositories.


```js
const getConfig = require('probot-config')

module.exports = app => {
  app.on('push', async context => {
    // Will look for 'test.yml' inside the '.github' folder
    const config = await getConfig(context, 'test.yml')

    context.log(config, 'Loaded config')
  })
}
```

Use the `_extends` option in your configuration file to extend settings from another repository.

For example, given `.github/test.yml`:

```yaml
_extends: github-settings
# Override values from the extended config or define new values
name: myrepo
```

This configuration will be merged with the `.github/test.yml` file from the `github-settings` repository, which might look like this:

```yaml
shared1: will be merged
shared2: will also be merged
```

Just put common configuration keys in a repository within your organization. Then reference this repository from config files with the same name.

## Commands

[probot-commands](http://github.com/probot/commands) is an extension that adds slash commands to GitHub. Slash commands are lines that start with `/` in comments on Issues or Pull Requests that allow users to interact directly with your app.

For example, users could add labels from comments by typing `/label in-progress`.

```js
const commands = require('probot-commands')

module.exports = app => {
  // Type `/label foo, bar` in a comment box for an Issue or Pull Request
  commands(app, 'label', (context, command) => {
    const labels = command.arguments.split(/, */)
    return context.github.issues.addLabels(context.issue({labels}))
  })
}
```

## Metadata

[probot-metadata](https://github.com/probot/metadata) is an extension that stores metadata on Issues and Pull Requests.

For example, here is a contrived app that stores the number of times that comments were edited in a discussion and comments with the edit count when the issue is closed.

```js
const metadata = require('probot-metadata')

module.exports = app => {
  app.on(['issues.edited', 'issue_comment.edited'], async context => {
    const kv = await metadata(context)
    await kv.set('edits', await kv.get('edits') || 1)
  })

  app.on('issues.closed', async context => {
    const edits = await metadata(context).get('edits')
    context.github.issues.createComment(context.issue({
      body: `There were ${edits} edits to issues in this thread.`
    }))
  })
}
```

## Scheduler

[probot-scheduler](https://github.com/probot/scheduler) is an extension to trigger events on a periodic schedule. It triggers a `schedule.repository` event every hour for each repository it has access to.

```js
const createScheduler = require('probot-scheduler')

module.exports = app => {
  createScheduler(app)

  app.on('schedule.repository', context => {
    // this event is triggered on an interval, which is 1 hr by default
  })
}
```

Check out [stale](https://github.com/probot/stale) to see it in action.

## Attachments

[probot-attachments](https://github.com/probot/attachments) adds message attachments to comments on GitHub. This extension should be used any time an app is appending content to user comments.

```js
const attachments = require('probot-attachments')

module.exports = app => {
  app.on('issue_comment.created', context => {
    return attachments(context).add({
      'title': 'Hello World',
      'title_link': 'https://example.com/hello'
    })
  })
}
```

Check out [probot/unfurl](https://github.com/probot/unfurl) to see it in action.

## Community Created Extensions

[probot-messages](https://github.com/dessant/probot-messages) was created by [@dessant](https://github.com/dessant) to deliver messages that require user action to ensure the correct operation of the app.
