## Plugins

A plugin is just a [node module](https://nodejs.org/api/modules.html) that exports a function:

```js
module.exports = robot => {
  // your code here
};
```

The `robot` parameter is an instance of [`Robot`](/lib/robot.js) and gives you access to all of the bot goodness.

### Receiving GitHub webhooks

[GitHub webhooks](https://developer.github.com/webhooks/) are fired for almost every significant action that users take on GitHub, whether it's pushes to code, opening or closing issues, opening or merging pull requests, or commenting on a discussion.

Many robots will spend their entire day responding to these actions. `robot.on` will listen for any GitHub webhook events:

```js
module.exports = robot => {
  robot.on('push', event => {
    // Code was pushed to the repo, what should we do with it?
    console.log(event);
  });
};
```

The robot can listen to any of the [GitHub webhook events](https://developer.github.com/webhooks/#events). `event` object includes all of the information about the event that was triggered, and `event.payload` has the payload delivered by GitHub.

Most events also include an "action". For example, the [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`, `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`. Often, your bot will only care about one type of action, so you can append it to the event name with a `.`:

```js
module.exports = robot => {
  robot.on('issues.opened', event => {
    // An issue was just opened.
  });
};
```

### Interacting with GitHub

Probot uses [GitHub Integrations](https://developer.github.com/early-access/integrations/):

> Integrations are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Integrations are first class actors within GitHub.
>
> –Documentation on [GitHub Integrations](https://developer.github.com/early-access/integrations/)

An integration is a first-class actor on GitHub, like a user (e.g. [@defunkt](https://github/defunkt)) or a organization (e.g. [@github](https://github.com/github)). That means it can be given access to repositories and perform actions through the API like [commenting on an issue](https://developer.github.com/v3/issues/comments/#create-a-comment) or [creating a status](https://developer.github.com/v3/repos/statuses/#create-a-status). The integration is given access to a repository or repositories by being "installed" on a user or organization account.

Each event delivered includes an ID of the installation that triggered it, which can be used to authenticate. `robot.auth(id)` will give your plugin an authenticated GitHub client that can be used to make GitHub API calls.

```js
module.exports = function(robot) {
  robot.on('issues.opened', event => {
    const github = await robot.auth(event.payload.installation.id);
    // do something useful with the github client
  });
};
```

> Note: `robot.auth` is asynchronous, so it needs to be prefixed with a [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) to wait for the magic to happen.

The `github` value returned from authenticating is an instance of the [github Node.js module](https://github.com/mikedeboer/node-github), which swraps the [GitHub API](https://developer.github.com/v3/) and allows you to do almost anything programmatically that you can do through a web browser.

Here is an example of an autoresponder plugin that comments on opened issues:

```js
module.exports = function(robot) {
  robot.on('issues.opened', async function(event, context) {
    const github = await robot.auth(event.payload.installation.id);

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   {owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World!}
    const params = context.issue({body: 'Hello World!'})

    // Post a comment on the issue
    return github.issues.createComment(params);
  });
}
```

See the [full API docs](https://mikedeboer.github.io/node-github/) to see all the ways you can interact with GitHub. Some API endpoints are not available on GitHub Integrations yet, so check [which ones are available](https://developer.github.com/early-access/integrations/available-endpoints/) first.

### Running plugins

```
$ probot autoresponder.js
Listening on http://localhost:3000
```

script loading

### Distributing

These examples can be published as behaviors in NPM modules and deployed as stand-alone bots, or combined into one instance.

For example, if you wanted to deploy a bot for your project that included multiple plugins, you could just create a new app that has them both listed as dependencies in `package.json`:

```json
{
  "name": "my-probot",
  "priate": true,
  "dependencies": {
    "probot-autoresponder": "~1.0",
    "probot-configurer": "~1.0",
  },
  "scripts": {
    "start": "probot"
 },
 "probot": {
   "plugins": [
     "probot-autoresponder",
     "probot-configurer"
   ]
 }
}
```

Running the `$ npm start` on this app would start up a bot that included both of these behaviors.
