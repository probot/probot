---
next: docs/http.md
---

# Interacting with GitHub

Probot uses [GitHub Apps](https://developer.github.com/apps/). An app is a first-class actor on GitHub, like a user (e.g. [@defunkt](https://github.com/defunkt)) or an organization (e.g. [@github](https://github.com/github)). The app is given access to a repository or repositories by being "installed" on a user or organization account and can perform actions through the API like [commenting on an issue](https://developer.github.com/v3/issues/comments/#create-a-comment) or [creating a status](https://developer.github.com/v3/repos/statuses/#create-a-status).

`context.github` is an authenticated GitHub client that can be used to make API calls. It is an instance of the [github Node.js module](https://github.com/octokit/node-github), which wraps the [GitHub REST API](https://developer.github.com/v3/) and allows you to do almost anything programmatically that you can do through a web browser.

Here is an example of an autoresponder app that comments on opened issues:

```js
module.exports = robot => {
  robot.on('issues.opened', async context => {
    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   {owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World!}
    const params = context.issue({body: 'Hello World!'})

    // Post a comment on the issue
    return context.github.issues.createComment(params)
  })
}
```

See the [full API docs](https://octokit.github.io/node-github/) to see all the ways you can interact with GitHub. Some API endpoints are not available on GitHub Apps yet, so check [which ones are available](https://developer.github.com/v3/apps/available-endpoints/) first.
