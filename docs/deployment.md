---
next: docs/serverless-deployment.md
---

# Deployment

Every app can either be deployed stand-alone, or combined with other apps in one deployment.

> **Heads up!** Note that most [apps in the @probot organization](https://github.com/search?q=topic%3Aprobot-app+org%3Aprobot&type=Repositories) have an official hosted app that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

**Contents:**

1. [Create the GitHub App](#create-the-github-app)
1. [Deploy the app](#deploy-the-app)
    1. [Glitch](#glitch)
    1. [Heroku](#heroku)
    1. [ZEIT Now](#zeit-now)
    1. [Platform.sh](#platformsh)
1. [Share the app](#share-the-app)
1. [Combining apps](#combining-apps)
1. [Error tracking](#error-tracking)
1. [Serverless Deployments](#serverless)

## Create the GitHub App

Every deployment will need an [App](https://developer.github.com/apps/).

1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Homepage URL**: the URL to the GitHub repository for your app
    - **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed app.
    - **Webhook Secret**: Generate a unique secret with `openssl rand -base64 32` and save it because you'll need it in a minute to configure your deployed app.

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
2. Click on your app name on the top-right, press on advanced options and then on `Import from GitHub` (You will need to login with your GitHub account to enable that option). Enter the full repository name you want to import, e.g. for the [welcome app](https://github.com/behaviorbot/new-issue-welcome) it would be `behaviorbot/new-issue-welcome`. The `new-issue-welcome` app is a great template to get started with your own app, too!
3. Next open the `.env` file and replace its content with
   ```
   APP_ID=<your app id>
   WEBHOOK_SECRET=<your app secret>
   PRIVATE_KEY_PATH=.data/private-key.pem
   NODE_ENV=production
   ```
   Replace the two `<...>` placeholders with the values from your app. The `.env` file cannot be accessed or seen by others.
4. Press the `New File` button and enter `.data/private-key.pem`. Paste the content of your GitHub App’s `private-key.pem` in there and save it. Files in the `.data` folder cannot be seen or accessed by others, so your private key is safe.
5. That’s it, your app should have already started :thumbsup: Press on the `Show` button on top and paste the URL as the value of `Webhook URL`. Ensure that you remove `/probot` from the end of the `Webhook URL` that was just pasted.

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

### ZEIT Now

Deploy Probot as a Serverless Function to [ZEIT Now](http://zeit.co). After [creating the GitHub App](#create-the-github-app):

1. Install Now CLI with `npm i -g now` and login with `now login`

1. Clone the app that you want to deploy. e.g. `git clone https://github.com/probot/stale`

1. Install `probot-serverless-now`

        $ npm install probot-serverless-now

1. Update `package.json` and add `build` script to generate your HTML landing page, for example:
   ```json
   {
     "scripts": {
       "build": "mkdir public && echo 'Hello World' > public/index.html"
     }
   }
   ```

1. Create a new file `/api/index.js` with the following:
   ```js
   const { toLambda } = require('probot-serverless-now');
   const app = require('./path/to/your/app.js');
   module.exports = toLambda(app);
   ```

1. Create a new file `now.json` with the following:
   ```json
   {
     "env": {
       "APP_ID":"@probot-api-id",
       "WEBHOOK_SECRET": "@probot-webhook-secret",
       "PRIVATE_KEY": "@probot-private-key"
     }
   }
   ```

      **NOTE**: Add `LOG_LEVEL=trace` to get verbose logging, or add `LOG_LEVEL=info` instead to show less details.

1. Run `now secrets add probot-api-id aaa`, `now secrets add probot-webhook-secret bbb`, `now secrets add probot-private-key "$(cat ~/Downloads/*.private-key.pem | base64)"` replacing the `aaa` and `bbb` with the values for those variables.

1. Deploy with `now` or connect your GitHub repository](https://zeit.co/github) to ZEIT Now and deploy on `git push`.

1. Once the deploy is started, go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your deployment (which `now` has kindly copied to your clipboard).

1. You can optionally add a [Custom Domain](https://zeit.co/docs/v2/custom-domains) and deploy to production with the following:

        $ now --prod

1. Visit `https://your-deployment.now.sh/api` to invoke the serverless function.

### Platform.sh

There are two ways to deploy your Probot app to [Platform.sh](https://platform.sh/): [manually](#deploying-an-existing-project) or by modifying an existing [template project](#quickstart-deploying-a-template). Either will work, however the template has been designed to set the environment variables retrieved from GitHub during registration automatically, for every branch of your project, and may prove easier for migration in the long run.

#### Quickstart: Deploying a template

The easiest way to get a Probot app deployed on [Platform.sh](https://docs.platform.sh/) is to start with a [template project](https://github.com/platformsh-templates/probot). Platform.sh maintains a version of Probot's [Hello world](https://probot.github.io/docs/hello-world/) app, which delivers comments to newly opened issues, by clicking the button below.

<p align="center">
<a href="https://console.platform.sh/projects/create-project?template=https://raw.githubusercontent.com/platformsh/template-builder/master/templates/probot/.platform.template.yaml&utm_content=probot&utm_source=github&utm_medium=button&utm_campaign=deploy_on_platform">
    <img src="https://platform.sh/images/deploy/lg-blue.svg" alt="Deploy on Platform.sh" width="180px" />
</a>
</p>

The link will create a free trial account on Platform.sh, create a new project to host the app, and then deploy the [Probot template repository](https://github.com/platformsh-templates/probot) on that project.

After that, there are only a few steps left to set up and register the app:

1. Install the Platform.sh CLI

  Setting relevant environment variables and retrieving information about the Probot project will be much easier once you install the [Platform.sh CLI](https://docs.platform.sh/development/cli.html). Run the following command:

  ```
  curl -sS https://platform.sh/cli/installer | php
  ```

  You can find the system requirements and more information in the [installation instructions on GitHub](https://github.com/platformsh/platformsh-cli/blob/master/README.md#installation).

1. Follow the remaining steps in the README

  The template is designed to set the `APP_ID`, `PRIVATE_KEY`, and `WEBHOOK_SECRET` environment variables automatically for you during the registration process, by installing and using the [Platform.sh CLI](https://docs.platform.sh/development/cli.html) within your application container.

  Platform.sh allows you to branch your production application and deploy an exact copy of that application on staging and development environments that themselves can be registered with GitHub, becoming fully testable apps in their own right.

  Follow the remaining steps in the [README](https://github.com/platformsh-templates/probot/blob/master/README.md) to finish setting up the template.

1. Migrate your code

    After you have completed the above steps, you can branch your local repository and move your code onto that branch. You can revert the `NODE_ENV` variable to go through registration again for that environment

    ```
    echo 'export NODE_ENV="development"' > .environment
    ```

    and then repeat the steps above to register test the app on that development environment. When you're satisfied that your app is working as expected, merge it into the production application.

#### Deploying an existing project

You can branch the template above, add your application's code to it, and merge to fully migrate your app to Platform.sh. Alternatively, you can manually configure your Probot app to deploy on Platform.sh with only a few changes to your repository.

1. [Create a free trial account](https://accounts.platform.sh/platform/trial/general/setup)

1. Create a new project

  When you create a new account, the setup wizard will direct you to create a new project. Name it, and select a region for the project to be served from.

1. Install the [Platform.sh CLI]([Platform.sh CLI](https://docs.platform.sh/development/cli.html))

  Run the command

  ```
  curl -sS https://platform.sh/cli/installer | php
  ```

  You can find the system requirements and more information in the [installation instructions on GitHub](https://github.com/platformsh/platformsh-cli/blob/master/README.md#installation).

1. Importing your application code

  If you are just testing out Platform.sh, feel free to push a local copy of your repository directly.

  First, retrieve the project ID for the project you just created with the command `platform project:list`. Then, set Platform.sh as a remote for your repository:

  ```
  platform project:set-remote <PROJECT ID>
  ```

  Alternatively, you can also set up an integration to GitHub, triggering environment deployments with every pull request. Follow the steps in the [public documentation](https://docs.platform.sh/administration/integrations/github.html) to set up the integration.

1. Add Platform.sh configuration files

  Each project on Platform.sh requires at least [three configuration files](https://docs.platform.sh/overview/structure.html) to describe and application. From your project root, run the following commands to create them:

  ```
  mkdir .platform
  touch .platform/routes.yaml && touch .platform/services.yaml
  touch .platform.app.yaml
  ```

  Unless your Probot app depends on [database storage](https://probot.github.io/docs/persistence/), the `services.yaml` file can be left empty. If a database is needed, visit the Platform.sh [Services documentation](https://docs.platform.sh/configuration/services.html) for more detailed information on how to configure the service your app depends on.

  In your [`routes.yaml`](https://docs.platform.sh/configuration/routes.html) file, copy the following:

  ```yaml
  "https://{default}/":
    type: upstream
    upstream: "app:http"

  "https://www.{default}/":
      type: redirect
      to: "https://{default}/"
  ```

  This configuration directs requests to an application container called `app`, and sets an additional redirect for requests that include the `www` prefix.

  Lastly, in the [`.platform.app.yaml`](https://docs.platform.sh/configuration/app-containers.html) file, include the settings below:

  ```yaml
  name: app

  type: 'nodejs:12'

  variables:
      env:
          NODE_ENV: development

  disk: 256

  web:
    commands:
      start: "npm start"
  ```

  This file defines your Probot app to run in a Node.js application container called `app`, with 256Mb of persistent storage. Feel free to modify the `web.commands.start` to match the start command of your app.

  You can set the application container to use a number of Node.js versions (defined in `type`), so visit the [documentation](https://docs.platform.sh/languages/nodejs.html#supported-versions) for a full list of those supported.


1. Register the app on GitHub

  Commit and push these changes. In your Platform.sh management console, when the branch's deployment has finished, you can visit the deployed app by clicking the "URL" dropdown button at the bottom of the page.

  At this point, you can register the app with GitHub. After you do so however, the registration will fail to complete, because  GitHub is attempting to write to Platform.sh's read-only file system. The template above contains a work-around for this step, so feel free to consult [that project](https://github.com/platformsh-templates/probot) if you'd like to streamline this step.

  Visit the settings page for the app you have just registered. You will need the settings there to set your project's environment variables to complete registration.

1. Set environment variables

  Using the CLI, set the following environment variables you retrieved from the registration steps:

  ```
  platform variable:create --level environment --environment master env:APP_ID --value <APP_ID> --inheritable false --json false --sensitive false --enabled true --no-wait
  platform variable:create --level environment --environment $PLATFORM_BRANCH env:WEBHOOK_SECRET --value <WEBHOOK_SECRET> --sensitive true --inheritable false --json false --enabled true --no-wait
  ```

  Write your private key to a temporary file in the project root called `temp-key.txt`. Once you have created the variable for it, you are free to delete it.

  ```
  platform variable:create --level environment --environment master env:PRIVATE_KEY --value="$(cat registration/temp-key.txt)" --sensitive true --inheritable false --json false --enabled true --no-wait
  ```

1. Set for production

  Each time you add a new variable to the project, the environment will be redeployed. When all of the redeployments have finished, modify the `variables.env.NODE_ENV` variable to read:

  ```yaml
  variables:
      env:
          NODE_ENV: production
  ```

  Then commit and push the change to the project.

1. Verify

  When the final redeployment has completed, and all of your environment variables have been added, go to your GitHub App's advanced settings.

  You will see that the first delivery it attempted to deliver to Platform.sh failed while you were registering.

  Expand the previous failed delivery by clicking the three dots, and then click Redeliver and then Yes, repeat this delivery to repeat the delivery. Since you have set up the app for production, it should now show a 200 successful response.

  Scroll to the bottom of the "General" settings page and click the "Active" checkbox so that GitHub can start sending more deliveries once it's installed on a repository.

1. Test on a repository

  Visit your application's public page (https://github.com/apps/APPLICATION_NAME) and click Install. Install it on the repository of your choice, and you will see that once you open a new issue the app will deliver a new response comment onto it.

## Share the app

The Probot website includes a list of [featured apps](https://probot.github.io/apps). Consider [adding your app to the website](https://github.com/probot/probot.github.io/blob/master/CONTRIBUTING.md#adding-your-app
) so others can discover and use it.

## Combining apps

To deploy multiple apps in one instance, create a new app that has the existing apps listed as dependencies in `package.json`:

```json
{
  "name": "my-probot-app",
  "private": true,
  "dependencies": {
    "probot-autoresponder": "probot/autoresponder",
    "probot-settings": "probot/settings"
  },
  "scripts": {
    "start": "probot run"
 },
 "probot": {
   "apps": [
     "probot-autoresponder",
     "probot-settings"
   ]
 }
}
```

## Error tracking

Probot comes bundled with a client for the [Sentry](https://github.com/getsentry/sentry) exception tracking platform. To enable Sentry:

  1. [Install Sentry from Marketplace](https://github.com/marketplace/sentry) (with [10k events/month free](https://github.com/marketplace/sentry/plan/MDIyOk1hcmtldHBsYWNlTGlzdGluZ1BsYW40Nw==#pricing-and-setup)) or [host your own instance](https://github.com/getsentry/sentry) (Students can get [extra Sentry credit](https://education.github.com/pack))
  2. Follow the setup instructions to find your DSN.
  3. Set the `SENTRY_DSN` environment variable with the DSN you retrieved.

## Serverless
Serverless abstracts away the most menial parts of building an application, leaving developers to write code and not actively manage scaling for their applications. The [Serverless Deployment](./serverless-deployment.md) section will show you how to deploy you application using functions instead of servers.
