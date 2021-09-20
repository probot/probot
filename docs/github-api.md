---
next: docs/configuration.md
title: Interacting with GitHub
---

# Interacting with GitHub

Probot uses [GitHub Apps](https://docs.github.com/developers/apps/) for authorizing requests to GitHub's APIs. A registered GitHub App is a first-class actor on GitHub, like a user (e.g. [@bkeepers](https://github.com/bkeepers)) or an organization (e.g. [@github](https://github.com/github)). The GitHub App is granted access to all or selected repositories by being "installed" on a user or organization account and can perform actions through the API like [commenting on an issue](https://docs.github.com/rest/reference/issues#create-an-issue-comment) or [creating a status](https://docs.github.com/rest/reference/repos#create-a-commit-status).

Your Probot app has access to an authenticated [Octokit client](https://octokit.github.io/rest.js/) that can be used to make API calls. It supports both the [GitHub REST API](https://docs.github.com/rest), and the [GitHub GraphQL API](https://docs.github.com/graphql).

## REST API

`context.octokit` is an instance of the [`@octokit/rest` Node.js module](https://github.com/octokit/rest.js#readme), and allows you to do almost anything programmatically that you can do through a web browser.

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

See the [full API docs](https://octokit.github.io/rest.js/) to see all the ways you can interact with GitHub. Some API endpoints are not available on GitHub Apps yet, so check [which ones are available](https://docs.github.com/en/rest/overview/endpoints-available-for-github-apps) first.

## GraphQL API

Use `context.octokit.graphql` to make requests to the [GitHub GraphQL API](https://docs.github.com/en/graphql).

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

Check out the [GitHub GraphQL API docs](https://docs.github.com/en/graphql) to learn more.

## Unauthenticated Events

When [receiving webhook events](./webhooks.md), `context.octokit` is _usually_ an authenticated client, but there are a few events that are exceptions:

- [`installation.deleted` & `installation.suspend`](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#installation) - The installation was _just_ deleted or suspended, so we can't authenticate as the installation.

- [`marketplace_purchase`](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#marketplace_purchase) - The purchase happens before the app is installed on an account.

For these events, `context.octokit` will be unauthenticated. Attemts to send any requests will fail with an error explaining the circumstances.

## GitHub Enterprise

If you want to run a Probot App against a GitHub Enterprise instance, you'll need to create and set the `GHE_HOST` environment variable inside of the `.env` file.

```
GHE_HOST=fake.github-enterprise.com
```

When [using Probot programmatically](./development.md#run-probot-programmatically), set the `baseUrl` option for the [`Probot`](https://probot.github.io/api/latest/classes/probot.html) constructor to the full base Url of the REST API

```js
const MyProbot = Probot.defaults({
  baseUrl: "https://fake.github-enterprise.com/api/v3",
});
```
