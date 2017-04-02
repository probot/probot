# Deploy

Every plugin can either be deployed as a stand-alone bot, or combined with other plugins in one deployment.

> **Heads up!** Note that most [plugins in the @probot organization](https://github.com/search?q=topic%3Aprobot-plugin+org%3Aprobot&type=Repositories) have an official hosted integration that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

## Create the GitHub Integration

1. [Create a new GitHub Integration](https://github.com/settings/integrations/new) with:
    - **Homepage URL**: the URL to the GitHub repository for your plugin
    - **Callback URL** and **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed plugin.
    - **Webhook Secret**: Generate a unique secret with `openssl rand -base64 32` and save it because you'll need it in a minute to configure your deployed plugin.
    - **Permissions & events**: See `docs/permissions.md` in the plugin for a list of the permissions and events that it needs access to.

1. Download the private key from the Integration

1. Make sure that you click the green **Install** button on the top left of the integration page. This gives you an option of installing the integration on all or a subset of your repositories.

## Deploy the plugin

To deploy a plugin to any cloud provider, you will need 3 environment variables:

- `INTEGRATION_ID`: the ID of the integration, which you can get from the [integration settings page](https://github.com/settings/integrations).
- `WEBHOOK_SECRET`: the **Webhook Secret** that you generated when you created the integration.
- `PRIVATE_KEY`: the contents of the private key you downloaded after creating the integration.

### Heroku

TODO: Generic docs for deploying a plugin to Heroku

### Now

Zeit [Now](http://zeit.co/now) is a great service for running Probot plugins. After [creating the GitHub Integration](#create-the-github-integration):

1. Make sure you have a local clone of the plugin that you want to deploy. e.g. `git clone https://github.com/probot/stale`

1. Install the now CLI with `npm i -g now`

1. Run `now` to deploy, replacing the `INTEGRATION_ID` and `WEBHOOK_SECRET` with the values for those variables, and setting the path for the `PRIVATE_KEY`:

        now -e INTEGRATION_ID=aaa \
            -e WEBHOOK_SECRET=bbb \
            -e PRIVATE_KEY="$(cat ~/Downloads/*.private-key.pem)"

1. Once the deploy is started, go back to your [integration settings page](https://github.com/settings/integrations) and update the **Callback URL** and **Webhook URL** to the URL of your deployment (which `now` has kindly copied to your clipboard).

Your plugin should be up and running!

## Combining plugins

To deploy a bot that includes multiple plugins, create a new app that has the plugins listed as dependencies in `package.json`:

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
