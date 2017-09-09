---
next: docs/best-practices.md
---

# Deployment

Every app can either be deployed stand-alone, or combined with other apps in one deployment.

> **Heads up!** Note that most [apps in the @probot organization](https://github.com/search?q=topic%3Aprobot-app+org%3Aprobot&type=Repositories) have an official hosted app that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

**Contents:**

1. [Create the GitHub App](#create-the-github-app)
1. [Deploy the app](#deploy-the-app)
    1. [Glitch](#glitch)
    1. [Heroku](#heroku)
    1. [Now](#now)
1. [Combining apps](#combining-apps)

## Create the GitHub App

Every deployment will need an [App](https://developer.github.com/apps/).

1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Homepage URL**: the URL to the GitHub repository for your app
    - **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed app.
    - **Webhook Secret**: Generate a unique secret with `openssl rand -base64 32` and save it because you'll need it in a minute to configure your deployed app.
    - **Permissions & events**: See `docs/deploy.md` in the app for a list of the permissions and events that it needs access to.

1. Download the private key from the app.

1. Make sure that you click the green **Install** button on the top left of the app page. This gives you an option of installing the app on all or a subset of your repositories.

## Deploy the app

To deploy an app to any cloud provider, you will need 3 environment variables:

- `APP_ID`: the ID of the app, which you can get from the [app settings page](https://github.com/settings/apps).
- `WEBHOOK_SECRET`: the **Webhook Secret** that you generated when you created the app.

And one of:

- `PRIVATE_KEY`: the contents of the private key you downloaded after creating the app, OR...
- `PRIVATE_KEY_PATH`: the path to a private key file.

`PRIVATE_KEY` takes precedence over `PRIVATE_KEY_PATH`.

### Glitch

Glitch lets you host node applications for free and edit them directly in your browser. It’s great for experimentation and entirely sufficient for simple apps.

1. [Create a new app on Glitch](https://glitch.com/edit/#!/new-project).
2. Click on your app name on the top-right, press on advanced options and then on `Import from GitHub` (You will need to login with your GitHub account to enable that option). Enter the full repository name you want to import, e.g. for the [welcome bot](https://github.com/behaviorbot/new-issue-welcome) it would be `behaviorbot/new-issue-welcome`. The `new-issue-welcome` bot is a great template to get started with your own bot, too!
3. Next open the `.env` file and replace its content with
   ```
   APP_ID=<your app id>
   WEBHOOK_SECRET=<your app secret>
   PRIVATE_KEY_PATH=.data/private-key.pem
   NODE_ENV=production
   ```
   Replace the two `<...>` placeholders with the values from your app. The `.env` file cannot be accessed or seen by others.
4. Press the `New File` button and enter `.data/private-key.pem`. Paste the content of your GitHub App’s `private-key.pem` in there and save it. Files in the `.data` folder cannot be seen or accessed by others, so your private key is safe.
5. That’s it, your app should have already started :thumbsup: Press on the `Show` button on top and paste the URL as the value of `Webhook URL`.

Enjoy!

**Bonus:** You can deploy your app using [glitch-deploy](https://github.com/gr2m/glitch-deploy) directly from your terminal or as [continuous deployment](https://github.com/gr2m/glitch-deploy#deploy-from-ci).

### Heroku

Probot runs like [any other Node app](https://devcenter.heroku.com/articles/deploying-nodejs) on Heroku. After [creating the GitHub App](#create-the-github-app):

1. Make sure you have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) client installed.

1. Clone the app that you want to deploy. e.g. `git clone https://github.com/probot/stale`

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

1. Deploy the app to heroku with `git push`:

        $ git push heroku master
        ...
        -----> Node.js app detected
        ...
        -----> Launching... done
              http://arcane-lowlands-8408.herokuapp.com deployed to Heroku

1. Your app should be up and running! To verify that your app
   is receiving webhook data, you can tail your app's logs:

        $ heroku config:set LOG_LEVEL=trace
        $ heroku logs --tail

### Now

Zeit [Now](http://zeit.co/now) is a great service for running Probot apps. After [creating the GitHub App](#create-the-github-app):

1. Install the now CLI with `npm i -g now`

1. Clone the app that you want to deploy. e.g. `git clone https://github.com/probot/stale`

1. Run `now` to deploy, replacing the `APP_ID` and `WEBHOOK_SECRET` with the values for those variables, and setting the path for the `PRIVATE_KEY`:

        $ now -e APP_ID=aaa \
            -e WEBHOOK_SECRET=bbb \
            -e PRIVATE_KEY="$(cat ~/Downloads/*.private-key.pem)"

1. Once the deploy is started, go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your deployment (which `now` has kindly copied to your clipboard).

Your app should be up and running!

## Combining apps

To deploy a bot that includes multiple apps, create a new app that has the apps listed as dependencies in `package.json`:

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

## Error tracking

Probot comes bundled with a client for the [Sentry](https://github.com/getsentry/sentry) exception tracking platform. To enable Sentry:

  1. [Create a Sentry.io Account](https://sentry.io/signup/) (with [10k events/month free](https://sentry.io/pricing/)) or [host your own instance](https://github.com/getsentry/sentry) (Students can get [extra Sentry credit](https://education.github.com/pack))
  2. Follow the setup instructions to find your DSN.
  3. Set the `SENTRY_DSN` environment variable with the DSN you retrieved.
