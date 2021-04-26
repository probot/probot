---
next: docs/persistence.md
title: Extensions
---

# Extensions

While Probot doesn't have an official extension API, there are a handful of reusable utilities that have been extracted from existing apps.

<!-- toc -->

- [Commands](#commands)
- [Metadata](#metadata)
- [Attachments](#attachments)

<!-- tocstop -->

## Commands

[probot-commands](http://github.com/probot/commands) is an extension that adds slash commands to GitHub. Slash commands are lines that start with `/` in comments on Issues or Pull Requests that allow users to interact directly with your app.

For example, users could add labels from comments by typing `/label in-progress`.

```js
const commands = require("probot-commands");

module.exports = (app) => {
  // Type `/label foo, bar` in a comment box for an Issue or Pull Request
  commands(app, "label", (context, command) => {
    const labels = command.arguments.split(/, */);
    return context.octokit.issues.addLabels(context.issue({ labels }));
  });
};
```

## Metadata

[probot-metadata](https://github.com/probot/metadata) is an extension that stores metadata on Issues and Pull Requests.

For example, here is a contrived app that stores the number of times that comments were edited in a discussion and comments with the edit count when the issue is closed.

```js
const metadata = require("probot-metadata");

module.exports = (app) => {
  app.on(["issues.edited", "issue_comment.edited"], async (context) => {
    const kv = await metadata(context);
    await kv.set("edits", (await kv.get("edits")) || 1);
  });

  app.on("issues.closed", async (context) => {
    const edits = await metadata(context).get("edits");
    context.octokit.issues.createComment(
      context.issue({
        body: `There were ${edits} edits to issues in this thread.`,
      })
    );
  });
};
```

## Attachments

[probot-attachments](https://github.com/probot/attachments) adds message attachments to comments on GitHub. This extension should be used any time an app is appending content to user comments.

```js
const attachments = require("probot-attachments");

module.exports = (app) => {
  app.on("issue_comment.created", (context) => {
    return attachments(context).add({
      title: "Hello World",
      title_link: "https://example.com/hello",
    });
  });
};
```

Check out [probot/unfurl](https://github.com/probot/unfurl) to see it in action.
