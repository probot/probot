# API

This is the official probot API. Anything not documented here is subject to change without notice.

## Robot

The `robot` parameter available to plugins is an instance of [`Robot`](/lib/robot.js).

```js
module.exports = robot => {
  // your code here
};
```

### on

`robot.on` will listen for any GitHub [GitHub webhooks](https://developer.github.com/webhooks/), which are fired for almost every significant action that users take on GitHub. The `on` method takes a callback, which will be invoked with two arguments when GitHub delivers a webhook:

- `event` - the event that was triggered, including `event.payload` which has the payload from GitHub.
- [`context`](#context) - helpers for extracting information from the event, which can be passed to GitHub API calls

```js
module.exports = robot => {
  robot.on('push', (event, context) => {
    // Code was pushed to the repo, what should we do with it?
    robot.log(event);
  });
};
```

Most events also include an "action". For example, the [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`, `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`. Often, your bot will only care about one type of action, so you can append it to the event name with a `.`:

```js
module.exports = robot => {
  robot.on('issues.opened', event => {
    // An issue was just opened.
  });
};
```

### auth

`robot.auth(id)` will return an authenticated GitHub client that can be used to make API calls. It takes the ID of the installation, which can be extracted from an event:

```js
module.exports = function(robot) {
  robot.on('issues.opened', async (event, context) => {
    const github = await robot.auth(event.payload.installation.id);
  });
};
```

> Note: `robot.auth` is asynchronous, so it needs to be prefixed with a [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) to wait for the magic to happen.

The `github` object returned from authenticating is an instance of the [github Node.js module](https://github.com/mikedeboer/node-github), which wraps the [GitHub API](https://developer.github.com/v3/) and allows you to do almost anything programmatically that you can do through a web browser.

### log

`robot.log` is a logger backed by [bunyan](https://github.com/trentm/node-bunyan).

```js
robot.log("This is a debug message");
robot.log.debug("…so is this");
robot.log.trace("Now we're talking");
robot.log.info("I thought you should know…");
robot.log.warn("Woah there");
robot.log.error("ETOOMANYLOGS");
robot.log.fatal("Goodbye, cruel world!");
```

The default log level is `debug`, but you can change it by setting the `LOG_LEVEL` environment variable to `trace`, `info`, `warn`, `error`, or `fatal`.

## Context

[Context](/lib/context.js) has helpers for extracting information from the webhook event, which can be passed to GitHub API calls.

### `repo`

Return the `owner` and `repo` params for making API requests against a repository. The object passed in will be merged with the repo params.

```js
const params = context.repo({path: '.github/stale.yml'})
// Returns: {owner: 'username', repo: 'reponame', path: '.github/stale.yml'}
```

### `issue`

Return the `owner`, `repo`, and `number` params for making API requests against an issue or pull request. The object passed in will be merged with the repo params.


```js
const params = context.issue({body: 'Hello World!'})
// Returns: {owner: 'username', repo: 'reponame', number: 123, body: 'Hello World!'}
```

### isBot

Returns a boolean if the actor on the event was a bot.
