# Contributing

## Running Locally

0. Clone the repository with `git clone https://github.com/bkeepers/PRobot.git`
0. Make sure you have a recent version of [Node.js](https://nodejs.org/) installed
0. Run `$ script/bootstrap` to install all the project dependencies
0. Install [ngrok](https://ngrok.com/download) (`$ brew cask install ngrok` on a mac), which will expose the local server to the internet so GitHub can send webhooks
0. Run `$ script/tunnel` to start ngrok, which should output something like `Forwarding https://4397efc6.ngrok.io -> localhost:3000`
0. [Register an integration](https://developer.github.com/early-access/integrations/creating-an-integration/) on GitHub with:
  - **Homepage URL**, **Callback URL**, and **Webhook URL**: The full ngrok url above. For example: `https://4397efc6.ngrok.io/`
  - **Secret:** `development`
  - **Permissions & events** needed will depend on how you use the bot, but for development it may be easiest to enable everything.
0. Download the private key and move it to `private-key.pem` in the project directory
0. Edit `.env` and fill in all the environment variables
0. With `ngrok` still running, open another terminal and run `$ script/server` to start the server on http://localhost:3000

Whenever you com back to work on the app after you've already had it running once, then you need to:

0. Run `$ script/server`
0. Run `$ script/tunnel` in another window
0. `ngrok` will use a different URL every time it is restarted, so you will have to go into the [settings for your Integration](https://github.com/settings/installations) and update all the URLs.

## Testing

To test with a real GitHub repository, you'll need to create a test repository and install the integration you created above:

0. Open up the settings for your installation and click "Install"
0. Create a `.probot.js` in your repository with:
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
