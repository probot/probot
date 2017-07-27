# Deploy

Every plugin can either be deployed as a stand-alone bot, or combined with other plugins in one deployment.

> **Heads up!** Note that most [plugins in the @probot organization](https://github.com/search?q=topic%3Aprobot-plugin+org%3Aprobot&type=Repositories) have an official hosted app that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

**Contents:**

1. [Create the GitHub App](#create-the-github-app)
1. [Deploy the plugin](#deploy-the-plugin)
    1. [Heroku](#heroku)
    1. [Now](#now)
1. [Combining plugins](#combining-plugins)

## Create the GitHub App

Every deployment will need an [App](https://developer.github.com/apps/).

1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Homepage URL**: the URL to the GitHub repository for your plugin
    - **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed plugin.
    - **Webhook Secret**: Generate a unique secret with `openssl rand -base64 32` and save it because you'll need it in a minute to configure your deployed plugin.
    - **Permissions & events**: See `docs/deploy.md` in the plugin for a list of the permissions and events that it needs access to.

1. Download the private key from the app.

1. Make sure that you click the green **Install** button on the top left of the app page. This gives you an option of installing the app on all or a subset of your repositories.

## Deploy the plugin

To deploy a plugin to any cloud provider, you will need 3 environment variables:

- `APP_ID`: the ID of the app, which you can get from the [app settings page](https://github.com/settings/apps).
- `WEBHOOK_SECRET`: the **Webhook Secret** that you generated when you created the app.

And one of:

- `PRIVATE_KEY`: the contents of the private key you downloaded after creating the app, OR...
- `PRIVATE_KEY_PATH`: the path to a private key file.

`PRIVATE_KEY` takes precedence over `PRIVATE_KEY_PATH`.

### Heroku

Probot runs like [any other Node app](https://devcenter.heroku.com/articles/deploying-nodejs) on Heroku. After [creating the GitHub App](#create-the-github-app):

1. Make sure you have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) client installed.

1. Clone the plugin that you want to deploy. e.g. `git clone https://github.com/probot/stale`

1. Create the Heroku app with the `heroku create` command:

        $ heroku create
        Creating arcane-lowlands-8408... done, stack is cedar
        http://arcane-lowlands-8408.herokuapp.com/ | git@heroku.com:arcane-lowlands-8408.git
        Git remote heroku added

1. Go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your deployment, e.g. `http://arcane-lowlands-8408.herokuapp.com/`.

1. Configure the Heroku app, replacing the `APP_ID` and `WEBHOOK_SECRET` with the values for those variables, and setting the path for the `PRIVATE_KEY`:

        $ heroku config:set APP_ID=aaa \
            WEBHOOK_SECRET=bbb \
            PRIVATE_KEY="$(cat ~/Downloads/*.private-key.pem)"

1. Deploy the plugin to heroku with `git push`:

        $ git push heroku master
        ...
        -----> Node.js app detected
        ...
        -----> Launching... done
              http://arcane-lowlands-8408.herokuapp.com deployed to Heroku

1. Your plugin should be up and running! To verify that your plugin 
   is receiving webhook data, you can tail your app's logs:

      $ heroku config:set LOG_LEVEL=trace
      $ heroku logs --tail

### Now

Zeit [Now](http://zeit.co/now) is a great service for running Probot plugins. After [creating the GitHub App](#create-the-github-app):

1. Install the now CLI with `npm i -g now`

1. Clone the plugin that you want to deploy. e.g. `git clone https://github.com/probot/stale`

1. Run `now` to deploy, replacing the `APP_ID` and `WEBHOOK_SECRET` with the values for those variables, and setting the path for the `PRIVATE_KEY`:

        $ now -e APP_ID=aaa \
            -e WEBHOOK_SECRET=bbb \
            -e PRIVATE_KEY="$(cat ~/Downloads/*.private-key.pem)"

1. Once the deploy is started, go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your deployment (which `now` has kindly copied to your clipboard).

Your plugin should be up and running!

## Combining plugins

To deploy a bot that includes multiple plugins, create a new app that has the plugins listed as dependencies in `package.json`:

```json
{
  "name": "my-probot",
  "private": true,
  "dependencies": {
    "probot-autoresponder": "probot/autoresponder",
    "probot-configurer": "probot/configurer"
  },
  "scripts": {
    "start": "probot run"
 },
 "probot": {
   "plugins": [
     "probot-autoresponder",
     "probot-configurer"
   ]
 }
}
```
