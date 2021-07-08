---
next: docs/development.md
title: Hello World
---

# Hello world

A Probot app is just a [Node.js module](https://nodejs.org/api/modules.html) that exports a function:

```js
module.exports = (app) => {
  // your code here
};
```

The `app` parameter is an instance of [`Probot`](https://probot.github.io/api/latest/classes/probot.html) and gives you access to all of the GitHub goodness.

`app.on` will listen for any [webhook events triggered by GitHub](./webhooks.md), which will notify you when anything interesting happens on GitHub that your app wants to know about.

```js
module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // A new issue was opened, what should we do with it?
    context.log.info(context.payload);
  });
};
```

The [`context`](https://probot.github.io/api/latest/classes/context.html) passed to the event handler includes everything about the event that was triggered, as well as some helpful properties for doing something useful in response to the event. `context.octokit` is an authenticated GitHub client that can be used to [make REST API and GraphQL calls](./github-api.md), and allows you to do almost anything programmatically that you can do through a web browser on GitHub.

Here is an example of an autoresponder app that comments on opened issues:

```js
module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World !}
    const params = context.issue({ body: "Hello World!" });

    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
};
```

To get started, you can use the instructions for [Developing an App](/docs/development/) or remix this 'Hello World' project on Glitch:

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/probot-hello-world)

Don't know what to build? Browse the [list of ideas](https://github.com/probot/ideas/issues) from the community for inspiration.
