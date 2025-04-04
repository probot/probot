---
next: github-api
title: Receiving webhooks
---

# Receiving Webhooks

[GitHub webhooks](https://docs.github.com/en/developers/webhooks-and-events/about-webhooks) are triggered for various significant actions on GitHub, such as pushing code, opening or closing issues, merging pull requests, and commenting on discussions.

As a Probot app developer, you can listen for these events and automate responses to them. The `app.on` method allows your app to subscribe to specific GitHub webhook events and execute logic accordingly.

## Listening to Webhook Events

To handle a webhook event, use `app.on(eventName, callback)`. The `context` object contains all relevant details about the event, including the payload sent by GitHub.

### Example: Handling a Push Event

```js
export default (app) => {
  app.on("push", async (context) => {
    // Code was pushed to the repository
    app.log.info("Received push event", context.payload);
  });
};
```

### Filtering by Action Type

Many events include an `action` property that specifies what happened. For example, the [`issues`](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#issues) event supports actions like `opened`, `closed`, and `edited`. You can listen for a specific action by appending it to the event name:

```js
export default (app) => {
  app.on("issues.opened", async (context) => {
    app.log.info("An issue was just opened", context.payload);
  });
};
```

### Listening to Multiple Events

To handle multiple webhook events with the same logic, pass an array of event names:

```js
export default (app) => {
  app.on(["issues.opened", "issues.edited"], async (context) => {
    app.log.info("An issue was opened or edited", context.payload);
  });
};
```

### Catching All Subscribed Events

To log all received webhook events, use `app.onAny()`:

```js
export default (app) => {
  app.onAny(async (context) => {
    app.log.info({ event: context.name, action: context.payload.action });
  });
};
```

## Further Reading

- [GitHub Webhook Events](https://docs.github.com/en/developers/webhooks-and-events)
- [Probot Webhook API](https://probot.github.io/docs/webhooks/)
- [@octokit/webhooks.js](https://github.com/octokit/webhooks.js/#webhook-events)
