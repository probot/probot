# Deployment

Every plugin can either be deployed as a stand-alone bot, or combined with other plugins.

## Combining plugins

To deploy a bot that includes multiple plugins, create a new app that has them both listed as dependencies in `package.json`:

```json
{
  "name": "my-probot",
  "priate": true,
  "dependencies": {
    "probot-autoresponder": "~1.0",
    "probot-configurer": "~1.0",
  },
  "scripts": {
    "run": "probot run"
 },
 "probot": {
   "plugins": [
     "probot-autoresponder",
     "probot-configurer"
   ]
 }
}
```

### Deploying to Heroku

0. [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy) - Click this button and pick an **App Name** that Heroku is happy with, like `your-name-probot`. Before you can complete this, you'll need config variables from the next step.
0. In another tab, [create an integration](https://developer.github.com/early-access/integrations/creating-an-integration/) on GitHub, using `https://your-app-name.herokuapp.com/` as the **Homepage URL**, **Callback URL**, and **Webhook URL**. The permissions and events that your bot needs access to will depend on what you use it for.
0. After creating your GitHub integration, go back to the Heroku tab and fill in the configuration variables with the values for the GitHub Integration
0. Create a `.probot.yml` file in your repository. See [Configuring](#configuring).
