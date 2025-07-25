---
next: http
title: Deployment
---

# Deployment

Every app can either be deployed stand-alone, or combined with other apps in one deployment.

> **Heads up!** Note that most [apps in the @probot organization](https://github.com/search?q=topic%3Aprobot-app+org%3Aprobot&type=Repositories) have an official hosted app that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

**Contents:**

<!-- toc -->

- [Register the GitHub App](#register-the-github-app)
- [Deploy the app](#deploy-the-app)
  - [As node app](#as-node-app)
    - [Heroku](#heroku)
    - [Render](#render)
  - [As serverless function](#as-serverless-function)
    - [AWS Lambda](#aws-lambda)
    - [Azure Functions](#azure-functions)
    - [Google Cloud Functions](#google-cloud-functions)
    - [GitHub Actions](#github-actions)
    - [Vercel](#vercel)
    - [Netlify Functions](#netlify-functions)
- [Share the app](#share-the-app)
- [Combining apps](#combining-apps)
- [Error tracking](#error-tracking)

<!-- tocstop -->

## Register the GitHub App

Every deployment will need a [GitHub App registration](https://docs.github.com/apps).

1. [Register a new GitHub App](https://github.com/settings/apps/new) with:
   - **Homepage URL**: the URL to the GitHub repository for your app
   - **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed app.
   - **Webhook Secret**: Generate a unique secret with (e.g. with `openssl rand -base64 32`) and save it because you'll need it in a minute to configure your Probot app.

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

### As node app

Probot can run your app function using the `probot` binary. If your app function lives in `./app.js`, you can start it as node process using `probot run ./app.js`

#### Heroku

Probot runs like [any other Node app](https://devcenter.heroku.com/articles/deploying-nodejs) on Heroku. After [creating the GitHub App](#register-the-github-app):

1.  Make sure you have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) client installed.

1.  Clone the app that you want to deploy. e.g. `git clone https://github.com/probot/stale`

1.  Create the Heroku app with the `heroku create` command:

        $ heroku create
        Creating arcane-lowlands-8408... done, stack is cedar
        http://arcane-lowlands-8408.herokuapp.com/ | git@heroku.com:arcane-lowlands-8408.git
        Git remote heroku added

1.  Go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your deployment, e.g. `http://arcane-lowlands-8408.herokuapp.com/api/github/webhooks`.

1.  Configure the Heroku app, replacing the `APP_ID` and `WEBHOOK_SECRET` with the values for those variables, and setting the path for the `PRIVATE_KEY`:

        $ heroku config:set APP_ID=aaa \
            WEBHOOK_SECRET=bbb \
            PRIVATE_KEY="$(cat ~/Downloads/*.private-key.pem)"

1.  Deploy the app to heroku with `git push`:

        $ git push heroku main
        ...
        -----> Node.js app detected
        ...
        -----> Launching... done
              http://arcane-lowlands-8408.herokuapp.com deployed to Heroku

1.  Your app should be up and running! To verify that your app
    is receiving webhook data, you can tail your app's logs:

         $ heroku config:set LOG_LEVEL=trace
         $ heroku logs --tail

#### Render

Probot runs like any other Node app on [Render](https://render.com/). After [creating the GitHub App](#register-the-github-app):

1.  Sign up at [Render](https://dashboard.render.com/register) and access your dashboard.
1.  Click "New Web Service" and select your GitHub repository.
1.  Set the "Build Command" and "Start Command". For a typical Probot app, use:

        Build Command: npm install
        Start Command: npm start

1.  Set the Instance Type to "Free" or any other type you prefer.

1.  Set environment variables:

        APP_ID=aaa
        WEBHOOK_SECRET=bbb
        PRIVATE_KEY=<paste your private key here>
        PORT=3000

    - Be sure to add `PORT=3000` because Render's default port is 10000, but Probot expects 3000.
    - For `PRIVATE_KEY`, paste the contents of your private key directly.

1.  Deploy the app by clicking the Deploy Web Service button. Render will automatically build and start your service.

1.  Go back to your [app settings page](https://github.com/settings/apps) and update the **Webhook URL** to the URL of your Render deployment, including the default webhook path, e.g. `https://your-app.onrender.com/api/github/webhooks`.

1.  Your app should be up and running! To verify that your app is receiving webhook data, check the "Logs" tab in the Render dashboard.

### As serverless function

When deploying your Probot app to a serverless/function environment, you don't need to worry about handling the http webhook requests coming from GitHub, the platform takes care of that. In many cases you can use [`createNodeMiddleware`](/docs/development/#use-createNodeMiddleware) directly, e.g. for Vercel or Google Cloud Function.

```js
import { Probot, createProbot } from "probot";
import { createMyMiddleware } from "my-probot-middleware";
import myApp from "./my-app.js";

export default createMyMiddleware(myApp, { probot: createProbot() });
```

For other environments such as AWS Lambda, Netlify Functions or GitHub Actions, you can use one of [Probot's adapters](https://github.com/probot/?q=adapter).

#### AWS Lambda

```js
// handler.js
import {
  createLambdaFunction,
  createProbot,
} from "@probot/adapter-aws-lambda-serverless";
import appFn from "./app.js";

export const webhooks = createLambdaFunction(appFn, {
  probot: createProbot(),
});
```

Learn more

- Probot's official adapter for AWS Lambda using the Serverless framework: [@probot/adapter-aws-lambda-serverless](https://github.com/probot/adapter-aws-lambda-serverless#readme)

Examples

- Probot's "Hello, world!" example deployed to AWS Lambda: [probot/example-aws-lambda-serverless](https://github.com/probot/example-aws-lambda-serverless/#readme)
- Issue labeler bot deployed to AWS Lambda: [riyadhalnur/issuelabeler](https://github.com/riyadhalnur/issuelabeler#issuelabeler)
- Auto-Me-Bot is deployed to AWS Lambda without using the _serverless_ framework and adapter: [TomerFi/auto-me-bot](https://github.com/TomerFi/auto-me-bot)

Please add yours!

#### Azure Functions

```js
// ProbotFunction/index.js
import {
  createProbot,
  createAzureFunction,
} from "@probot/adapter-azure-functions";
import app from "../app.js";

export default createAzureFunction(app, { probot: createProbot() });
```

Learn more

- Probot's official adapter for Azure functions: [@probot/adapter-azure-functions](https://github.com/probot/adapter-azure-functions#readme)

Examples

- Probot's "Hello, world!" example deployed to Azure functions: [probot/example-azure-function](https://github.com/probot/example-azure-function/#readme)

Please add yours!

#### Google Cloud Functions

```js
// function.js
import { createNodeMiddleware, createProbot } from "probot";
import app from "./app.js";

const middleware = await createNodeMiddleware(app, {
  probot: createProbot(),
  webhooksPath: "/",
});
exports.probotApp = (req, res) => {
  middleware(req, res, () => {
    res.writeHead(404);
    res.end();
  });
};
```

Examples

- Probot's "Hello, world!" example deployed to Google Cloud Functions: [probot/example-google-cloud-function](https://github.com/probot/example-google-cloud-function#readme)

Please add yours!

#### GitHub Actions

```js
import { run } from "@probot/adapter-github-actions";
import app from "./app.js";

run(app);
```

Learn more

- Probot's official adapter for GitHub Actions: [@probot/adapter-github-actions](https://github.com/probot/adapter-github-actions#readme)

Examples

- Probot's "Hello, world!" example deployed as a GitHub Action: [probot/example-github-action](https://github.com/probot/example-github-action/#readme)

Please add yours!

#### Vercel

```js
// api/github/webhooks/index.js
import { createNodeMiddleware, createProbot } from "probot";

import app from "../../../app.js";

export default await createNodeMiddleware(app, {
  probot: createProbot(),
  webhooksPath: "/api/github/webhooks",
});
```

**Important:** Set `NODEJS_HELPERS` environment variable to `0` in order to prevent Vercel from parsing the response body.
See [Disable Helpers](https://vercel.com/docs/functions/runtimes/node-js#disabling-helpers-for-node.js) for detail.

Examples

- [probot/example-vercel](https://github.com/probot/example-vercel#readme)
- [wip/app](https://github.com/wip/app#readme)
- [all-contributors/app](https://github.com/all-contributors/app#readme)
- [probot-nextjs-starter](https://github.com/maximousblk/probot-nextjs-starter#readme)

Please add yours!

#### Netlify Functions

[Netlify Functions](https://www.netlify.com/products/functions/) are deployed on AWS by Netlify itself. So we can use `@probot/adapter-aws-lambda-serverless` adapter for Netlify Functions as well.

```js
// functions/index.js
import {
  createLambdaFunction,
  createProbot,
} from "@probot/adapter-aws-lambda-serverless";
import appFn from "../src/app";

export const handler = createLambdaFunction(appFn, {
  probot: createProbot(),
});
```

## Share the app

The Probot website includes a list of [featured apps](https://probot.github.io/apps). Consider [adding your app to the website](https://github.com/probot/probot.github.io/blob/master/CONTRIBUTING.md#adding-your-app) so others can discover and use it.

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
    "apps": ["probot-autoresponder", "probot-settings"]
  }
}
```

Note that this feature is only supported when [run as Node app](#as-node-app). For serverless/function deployments, create a new Probot app that combines others programmatically

```js
// app.js
import autoresponder from "probot-autoresponder";
import settings from "probot-settings";

export default async (app, options) => {
  await autoresponder(app, options);
  await settings(app, options);
};
```

## Error tracking

Probot logs messages using [pino](https://getpino.io/). There is a growing number of tools that consume these logs and send them to error tracking services: https://getpino.io/#/docs/transports.

By default, Probot can send errors to [Sentry](https://sentry.io/) using its own transport [`@probot/pino`](https://github.com/probot/pino/#readme). Set the `SENTRY_DSN` environment variable to enable it.
