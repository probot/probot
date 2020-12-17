---
next: docs/http.md
---

# Interacting with GitHub

Probot uses [GitHub Apps](https://developer.github.com/apps/). An app is a first-class actor on GitHub, like a user (e.g. [@defunkt](https://github.com/defunkt)) or an organization (e.g. [@github](https://github.com/github)). The app is given access to a repository or repositories by being "installed" on a user or organization account and can perform actions through the API like [commenting on an issue](https://developer.github.com/v3/issues/comments/#create-a-comment) or [creating a status](https://developer.github.com/v3/repos/statuses/#create-a-status).

Your app has access to an authenticated GitHub client that can be used to make API calls. It supports both the [GitHub REST API](https://developer.github.com/v3/), and the [GitHub GraphQL API](https://developer.github.com/v4/).

## REST API

`context.octokit` is an instance of the [`@octokit/rest` Node.js module](https://github.com/octokit/rest.js), which wraps the [GitHub REST API](https://developer.github.com/v3/) and allows you to do almost anything programmatically that you can do through a web browser.

Here is an example of an autoresponder app that comments on opened issues:

```js
module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World! }
    const params = context.issue({ body: "Hello World!" });

    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
};
```

See the [full API docs](https://octokit.github.io/rest.js/) to see all the ways you can interact with GitHub. Some API endpoints are not available on GitHub Apps yet, so check [which ones are available](https://developer.github.com/v3/apps/available-endpoints/) first.

## GraphQL API

Use `context.octokit.graphql` to make requests to the [GitHub GraphQL API](https://developer.github.com/v4/).

Here is an example of the same autoresponder app from above that comments on opened issues, but this time with GraphQL:

```js
// GraphQL query to add a comment
const addComment = `
  mutation comment($id: ID!, $body: String!) {
    addComment(input: {subjectId: $id, body: $body}) {
      clientMutationId
    }
  }
`;

module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    // Post a comment on the issue
    context.octokit.graphql(addComment, {
      id: context.payload.issue.node_id,
      body: "Hello World",
    });
  });
};
```

The options in the 2nd argument will be passed as variables to the query. You can pass custom headers by using the `headers` key:

```js
// GraphQL query to pin an issue
const pinIssue = `
  mutation comment($id: ID!) {
    pinIssue(input: {subjectId: $id}) {
      clientMutationId
    }
  }
`;

module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    context.octokit.graphql(pinIssue, {
      id: context.payload.issue.node_id,
      headers: {
        accept: "application/vnd.github.elektra-preview+json",
      },
    });
  });
};
```

Check out the [GitHub GraphQL API docs](https://developer.github.com/v4/) to learn more.

## Unauthenticated Events

When [receiving webhook events](./webhooks.md), `context.octokit` is _usually_ an authenticated client, but there are a few events that are exceptions:

- [`installation.deleted`](https://developer.github.com/v3/activity/events/types/#installationevent) - The installation was _just_ deleted, so we can't authenticate as the installation.

- [`marketplace_purchase`](https://developer.github.com/v3/activity/events/types/#marketplacepurchaseevent) - The purchase happens before the app is installed on an account.

For these events, `context.octokit` will be [authenticated as the GitHub App](https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-a-github-app) instead of as a specific installation.

## GitHub Enterprise

If you want to run a Probot App against a GitHub Enterprise instance, you'll need to create and set the `GHE_HOST` environment variable inside of the `.env` file.

```
GHE_HOST=fake.github-enterprise.com
```

## Using Probot's customized Octokit class directly

Sometimes you may need to create your own instance of Probot's internally used Octokit class, for example when using the
[OAuth user authorization flow](https://developer.github.com/apps/building-github-apps/identifying-and-authorizing-users-for-github-apps/). You may access the class by importing `ProbotOctokit`:

```js
const { ProbotOctokit } = require("probot");

function myProbotApp(app) {
  const octokit = new ProbotOctokit({
    // any options you'd pass to Octokit
    auth: "token <myToken>",
    // and a logger
    log: app.log.child({ name: "my-octokit" }),
  });
}
```
