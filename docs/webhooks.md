---
next: docs/github-api.md
---

# Receiving Webhooks

[GitHub webhooks](https://developer.github.com/webhooks/) are fired for almost every significant action that users take on GitHub, whether it's pushes to code, opening or closing issues, opening or merging pull requests, or commenting on a discussion.

Many robots will spend their entire day responding to these actions. `robot.on` will listen for any GitHub webhook events:

```js
module.exports = robot => {
  robot.on('push', async context => {
    // Code was pushed to the repo, what should we do with it?
    robot.log(context)
  })
}
```

The robot can listen to any of the [GitHub webhook events](https://developer.github.com/webhooks/#events). The `context` object includes everything about the event that was triggered, and `context.payload` has the payload delivered by GitHub.

Most events also include an "action". For example, the [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`, `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`. Often, your bot will only care about one type of action, so you can append it to the event name with a `.`:

```js
module.exports = robot => {
  robot.on('issues.opened', async context => {
    // An issue was just opened.
  })
}
```

Sometimes you want to handle multiple webhook events the same way. `robot.on` can listen to a list of events and run the same callback:

```js
module.exports = robot => {
  robot.on(['issues.opened', 'issues.edited'], async context => {
    // An issue was opened or edited, what should we do with it?
    robot.log(context)
  })
}
```

You can also use the wildcard event (`*`) to listen for any event that your app is subscribed to:

```js
module.exports = robot => {
  robot.on(`*`, async context => {
    context.log({event: context.event, action: context.payload.action})
  })
}
```

Explore the [GitHub webhook documentation](https://developer.github.com/webhooks/#events) to see what events are available to use in your app.
