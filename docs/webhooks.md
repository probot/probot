---
next: docs/github-api.md
---

# Receiving webhooks

[GitHub webhooks](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/about-webhooks) are fired for almost every significant action that users take on GitHub, whether it's pushes to code, opening or closing issues, opening or merging pull requests, or commenting on a discussion.

Many apps will spend their entire day responding to these actions. `app.on` will listen for any GitHub webhook events:

```js
module.exports = (app) => {
  app.on("push", async (context) => {
    // Code was pushed to the repo, what should we do with it?
    app.log.info(context);
  });
};
```

The app can listen to any of the [GitHub webhook events](https://developer.github.com/webhooks/#events). The `context` object includes everything about the event that was triggered, and `context.payload` has the payload delivered by GitHub.

Most events also include an "action". For example, the [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`, `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`. Often, your app will only care about one type of action, so you can append it to the event name with a `.`:

```js
module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // An issue was just opened.
  });
};
```

Sometimes you want to handle multiple webhook events the same way. `app.on` can listen to a list of events and run the same callback:

```js
module.exports = (app) => {
  app.on(["issues.opened", "issues.edited"], async (context) => {
    // An issue was opened or edited, what should we do with it?
    app.log.info(context);
  });
};
```

You can also use `app.webhooks.onAny()` to listen for any event that your app is subscribed to:

```js
module.exports = (app) => {
  app.webhooks.onAny(async (context) => {
    context.log.info({ event: context.name, action: context.payload.action });
  });
};
```

For more details, explore the [GitHub webhook documentation](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/about-webhooks#events) or see a list of all the named events in the [@octokit/webhooks.js](https://github.com/octokit/webhooks.js/) npm module.
