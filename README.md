# PRobot

[![Join the chat at https://gitter.im/bkeepers/PRobot](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bkeepers/PRobot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

_**Heads up!** "PRobot" is a codename that is almost guaranteed to change._

PRobot is a trainable robot that responds to activity on GitHub. It's like [Hubot](https://hubot.github.com/), but for GitHub events instead of chat messages.

## Plugins

Here is an autoresponder module that comments on opened issues:

```js
// Export a function that takes `robot` as an argument
module.exports = function(robot) {
  // `robot.on` will listen for any GitHub webhook events
  robot.on('issues.opened', async function(event, context) {
    // Authenticate and get an instance of the NodeJS wrapper for the GitHub API
    // https://mikedeboer.github.io/node-github/
    const github = await robot.integration.asInstallation(event.payload.installation.id);

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   {owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World!}
    const params = context.issue({body: 'Hello World!'})

    // Post a comment on the issue
    return github.issues.createComment(params);
  });
}
```

```
$ probot autoresponder.js
Listening on http://localhost:5000
```

### As Modules

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

## Installing

_**Heads up!** The [demo integration](https://github.com/integration/probot-demo) is for demo purposes only. It is very likely to go away at some point, so please don't use it for production purposes._

0. Go to the **[demo integration](https://github.com/integration/probot-demo)**, click **Install**, and then select an organization.
0. Create a `.probot.js` file in your repository with the following contents. See [Configuration](docs/configuration.md) for more information on what behaviors can be built.

        on('issues.opened').comment(`
          Hello @{{ sender.login }}. Thanks for inviting me to your project.
          Read more about [all the things I can help you with][config]. I can't
          wait to get started!

          [config]: https://github.com/bkeepers/PRobot/blob/master/docs/configuration.md
        `);

        include("bkeepers/probot:docs/demo.js");

0. Open a new issue. @probot should post a comment (you may need to refresh to see it).

### Deploy your own bot to Heroku

0. [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy) - Click this button and pick an **App Name** that Heroku is happy with, like `your-name-probot`. Before you can complete this, you'll need config variables from the next step.
0. In another tab, [create an integration](https://developer.github.com/early-access/integrations/creating-an-integration/) on GitHub, using `https://your-app-name.herokuapp.com/` as the **Homepage URL**, **Callback URL**, and **Webhook URL**. The permissions and events that your bot needs access to will depend on what you use it for.
0. After creating your GitHub integration, go back to the Heroku tab and fill in the configuration variables with the values for the GitHub Integration
0. Create a `.probot.yml` file in your repository. See [Configuring](#configuring).
