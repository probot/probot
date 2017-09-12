---
next: docs/deployment.md
---

# Extensions

While Probot doesn't have an official extension API (yet), there are a handful of reusable utilities that have been extracted from existing apps.

## Scheduler

[probot-scheduler](https://github.com/probot/scheduler) is an extension to trigger events on a periodic schedule. It triggers a `schedule.repository` event every hour for each repository it has access to.

```js
const createScheduler = require('probot-scheduler')

module.exports = robot => {
  createScheduler(robot)

  robot.on('schedule.repository', context => {
    // this event is triggered on an interval, which is 1 hr by default;
  })
}
```

Check out [stale](https://github.com/probot/stale) to see it in action.

## Commands

[probot-commands](http://github.com/probot/commands) is an extension that adds slash commands to GitHub. Slash commands are lines that start with `/` in comments on Issues or Pull Requests that allow users to interact directly with your app.

For example, users could add labels from comments by typing `/label in-progress`.

```js
const commands = require('probot-commands')

module.exports = robot => {
  // Type `/label foo, bar` in a comment box for an Issue or Pull Request
  commands(robot, 'label', (context, command) => {
    const labels = command.arguments.split(/, */)
    return context.github.issues.addLabels(context.issue({labels}))
  })
}
```
