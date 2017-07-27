# Plugins

A plugin is just a [Node.js module](https://nodejs.org/api/modules.html) that exports a function:

```js
module.exports = robot => {
  // your code here
};
```

The `robot` parameter is an instance of [`Robot`](/lib/robot.js) and gives you access to all of the bot goodness.

## Receiving GitHub webhooks

[GitHub webhooks](https://developer.github.com/webhooks/) are fired for almost every significant action that users take on GitHub, whether it's pushes to code, opening or closing issues, opening or merging pull requests, or commenting on a discussion.

Many robots will spend their entire day responding to these actions. `robot.on` will listen for any GitHub webhook events:

```js
module.exports = robot => {
  robot.on('push', async context => {
    // Code was pushed to the repo, what should we do with it?
    robot.log(context);
  });
};
```

The robot can listen to any of the [GitHub webhook events](https://developer.github.com/webhooks/#events). The `context` object includes all of the information about the event that was triggered, and `context.payload` has the payload delivered by GitHub.

Most events also include an "action". For example, the [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) event has actions of `assigned`, `unassigned`, `labeled`, `unlabeled`, `opened`, `edited`, `milestoned`, `demilestoned`, `closed`, and `reopened`. Often, your bot will only care about one type of action, so you can append it to the event name with a `.`:

```js
module.exports = robot => {
  robot.on('issues.opened', async context => {
    // An issue was just opened.
  });
};
```

## Interacting with GitHub

Probot uses [GitHub Apps](https://developer.github.com/apps/). An app is a first-class actor on GitHub, like a user (e.g. [@defunkt](https://github/defunkt)) or an organization (e.g. [@github](https://github.com/github)). The app is given access to a repository or repositories by being "installed" on a user or organization account and can perform actions through the API like [commenting on an issue](https://developer.github.com/v3/issues/comments/#create-a-comment) or [creating a status](https://developer.github.com/v3/repos/statuses/#create-a-status).

`context.github` is an authenticated GitHub client that can be used to make API calls. It is an instance of the [github Node.js module](https://github.com/mikedeboer/node-github), which wraps the [GitHub API](https://developer.github.com/v3/) and allows you to do almost anything programmatically that you can do through a web browser.

Here is an example of an autoresponder plugin that comments on opened issues:

```js
module.exports = robot => {
  robot.on('issues.opened', async context => {
    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   {owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World!}
    const params = context.issue({body: 'Hello World!'})

    // Post a comment on the issue
    return context.github.issues.createComment(params);
  });
}
```

See the [full API docs](https://mikedeboer.github.io/node-github/) to see all the ways you can interact with GitHub. Some API endpoints are not available on GitHub Apps yet, so check [which ones are available](https://developer.github.com/v3/apps/available-endpoints/) first.

### Pagination

Many GitHub API endpoints are paginated. The `github.paginate` method can be used to get each page of the results.

```js
context.github.paginate(context.github.issues.getAll(context.repo()), res => {
  res.data.issues.forEach(issue => {
    robot.console.log('Issue: %s', issue.title);
  });
});
```

## Running plugins

Before you can run your plugin against GitHub, you'll need to set up your [development environment](development.md) and configure a GitHub App for testing. You will need the ID and private key of a GitHub App to run the bot.

Once you have an app created, install `probot`:

```
$ npm install -g probot
```

and run your bot from your plugin's directory, replacing `APP_ID` and `private-key.pem` below with your App's ID and the path to the private key of your app.

```
$ probot run -a APP_ID -P private-key.pem ./index.js
Listening on http://localhost:3000
```

## Simulating webhooks

As you are developing your plugin, you will likely want to test it by repeatedly trigging the same webhook. You can simulate a webhook being delivered by saving the payload to a file, and then calling `probot simulate` from the command line.

To save a copy of the payload, go to the  [settings](https://github.com/settings/apps) page for your App, and go to the **Advanced** tab. Click on one of the **Recent Deliveries** to expand it and see the details of the webhook event. Copy the JSON from the the **Payload** and save it to a new file. (`test/fixtures/issues.labeled.json` in this example).

![](https://user-images.githubusercontent.com/173/28491924-e03e91f2-6ebe-11e7-9570-6d48da68c6ca.png)

Next, simulate this event being delivered by running:

```
$ node_modules/.bin/probot simulate issues test/fixtures/issues.labeled.json ./index.js
```

## Publishing your bot

Plugins can be published in npm modules, which can either be deployed as stand-alone bots, or combined with other plugins.

Use [create-probot-plugin](https://github.com/probot/create-probot-plugin) to get started building your plugin as a node module.

```
$ npm install -g create-probot-app

$ create-probot-plugin my-plugin
$ cd my-plugin
$ npm install
```

## Next

- [See the full Probot API](https://probot.github.io/probot/latest/)
- [Tips for development](development.md)
- [Deploy your plugin](deployment.md)
