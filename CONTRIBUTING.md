# Contributing

## Setup

0. Clone the repo
0. Make sure you have the latest version of [Node.js](https://nodejs.org/) to develop locally.
0. Run `$ script/bootstrap` to install all the project dependencies
0. Until this gets built into a proper [Integration](https://developer.github.com/early-access/integrations/), the bot will need a valid GitHub API token to be able to do anything useful. Create a new [Personal access token](https://github.com/settings/tokens/new) and select the `repo` scope.
0. Re-start the local server with the token by running: `$ GITHUB_TOKEN=xxx script/server` to run the server on http://localhost:3000
0. Download [ngrok](https://ngrok.com/download) (`$ brew cask install ngrok` on a mac), which will expose a local server to the internet.
0. With the server still running, open a new terminal tab and run `ngrok http 3000`, which should output something like `Forwarding http://4397efc6.ngrok.io -> localhost:3000`.

## Testing
To test with a real GitHub repository, you'll need to create a test repository and configure a new webhook:

0. Head over to the **Settings** page of your repository, and click on **Webhooks & services**. Then, click on **Add webhook**. Configure it with:
  - **Payload URL:** Use the full `*.ngrok.io`
  - **Secret:** `development`
  - **Which events would you like to trigger this webhook?:** Choose **Send me everything**.
0. Create a `.probot.js` in your repo with:

        on("issues.opened").comment("Hello World! Your bot is working!");

0. Open a new issue. Your bot should post a comment (you may need to refresh to see it).

## Debugging
0. Always run `$ script/bootstrap` and restart the server if package.json has changed.
0. To turn on verbose logging, start server by running ` $ DEBUG=Probot GITHUB_TOKEN=xxx script/server`
0. To see what requests are going out, enable debugging mode for  GitHub client in `/server.js`:

        const github = new GitHubApi({
          debug: true
        });

## Adding an action

_**TODO:** This is out of date and will be updated after plugin API is settled._

[Actions](docs/configuration.md#then) are called when a webhook is delivered and any conditions are met. For example, this configuration in `.probot` calls two actions when a new issue is opened:

```
on issues.opened
then
  label("triage") # <-- `label` is an action
  and close       # <-- and so is `close`
;
```

These actions are defined in [`lib/actions/label.js`](lib/actions/label.js) and [`lib/actions/close.js`](lib/actions/close.js).

Implementing new actions is relatively straight forward. Create a file in `lib/actions/{name}.js`, replacing `name` with the name of the action, and add the new action in [`lib/actions.js`](lib/actions.js). An action is a function that takes two arguments and returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise):

```javascript
module.exports = function (context, args) {
  return Promise.resolve('This action is a no-op');
};
```

The two arguments are:

- The aptly named [`context`](lib/context.js) argument provides context for the current webhook. There are two properties that will likely be most helpful:
  - `context.github` is an authenticated instance of the GitHub API client. See the [node-github documentation](http://mikedeboer.github.io/node-github/) for more information.
  - `context.payload` is the webhook payload. Depending on the type of event, the payload will be slightly different. See the [GitHub webhook docs](https://developer.github.com/webhooks/#payloads) for more information.
- `args` is any arguments passed to the action. For the `label` action called in the example above, `args` will be the string `"triage"`.

Actions must return a `Promise` that gets resolved when the action completes. Fortunately, the GitHub API client available in `context.github` returns promises, so you can usually just return the API call. For example, here is the full implementation of the `react` action:

```javascript
module.exports = function (context, react) {
  return context.github.reactions.createForIssue(
    context.payload.toIssue({content: react})
  );
};
```

Note that `context.payload.toIssue()` will extract the `owner`, `repo`, and `number` params from the [`issues`](https://developer.github.com/v3/activity/events/types/#issuesevent) or [`pull_request`](https://developer.github.com/v3/activity/events/types/#pullrequestevent) events.

That's it! You now have everything you need to implement an action. If you're looking for ideas of new actions to add, check out this [tracking issue for unimplemented GitHub actions](https://github.com/bkeepers/PRobot/issues/21).

## Adding a condition

_**TODO:** This is out of date and will be updated after plugin API is settled._

[Conditions](docs/configuration.md#then) are called when a webhook is delivered and are used to determine if the actions should be called. For example, this configuration in `.probot` checks if an issue or pull request has a label before closing it:

```
on issues.labeled or pull_request.labeled
if labeled("wontfix")  # <-- `labeled` is a condition
then close;
```

This condition is defined in [`lib/conditions/labeled.js`](lib/conditions/labeled.js).

Like [adding an action](#actions), adding a new condition is straight forward. Create a file in `lib/conditions/{name}.js`, replacing `name` with the name of the condition, and add the new condition in [`lib/conditions.js`](lib/conditions.js). A condition is a function that takes two arguments and returns `true` or `false`:

```javascript
module.exports = function (context, args) {
  return context.payload.sender.login === "bkeepers";
};
```

Check out docs for [adding an action](#actions) for more information on the two arguments.

And that's it! You now have everything you need to add a condition.
