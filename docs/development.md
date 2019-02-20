---
next: docs/webhooks.md
---

# Developing an app

To develop a Probot app, you will first need a recent version of [Node.js](https://nodejs.org/) installed. Open a terminal and run `node -v` to verify that it is installed and is at least 8.3.0 or later. Otherwise, [install the latest version](https://nodejs.org/).

## Generating a new app

[create-probot-app](https://github.com/probot/create-probot-app) is the best way to start building a new app. It will generate a new app with everything you need to get started and run your app in production.

To get started, run one of these commands:

- If you're using npm: `$ npx create-probot-app my-first-app`
- or, if you're using Yarn: `$ yarn create probot-app my-first-app`

> `create-probot-app` accepts an optional `template` argument which accepts the following values: `basic-js`, `checks-js`, `git-data-js`, `deploy-js` and `basic-ts` (use this one for TypeScript support).

This will ask you a series of questions about your app, which should look something like this:

```
Let's create a Probot app!
? App name: my-first-app
? Description of app: A "Hello World" GitHub App built with Probot
? Author's full name: Katie Horne
? Author's email address: katie@auth0.com
? Homepage:
? GitHub user or org name: khorne3
? Repository name: my-first-app
? Which template would you like to use? (Use arrow keys)
❯ basic-js
  checks-js
  git-data-js
  deploy-js
  basic-ts
created files...
Finished scaffolding files!

Installing Node dependencies!

Done! Enjoy building your Probot app!
```

The most important files here are `index.js`, which is where the code for your app will go, and `package.json`, which makes this a standard [npm module](https://docs.npmjs.com/files/package.json).

## Running the app locally

Now you're ready to run the app on your local machine. Run `npm run dev` to start the server:


> Note: If you're building a TypeScript app, be sure to run `npm run build` first!

```
> testerino@1.0.0 dev /Users/hiimbex/Desktop/testerino
> nodemon

[nodemon] 1.18.4
[nodemon] to restart at any time, enter `rs`
[nodemon] watching: .env *.*
[nodemon] starting `npm start`

> testerino@1.0.0 start /Users/hiimbex/Desktop/testerino
> probot run ./index.js

01:57:22.365Z  INFO probot:

  Welcome to Probot! Go to http://localhost:3000 to get started.

01:57:22.428Z  INFO probot: Forwarding https://smee.io/1S10MsoRSjZKWKMt to http://localhost:3000/
01:57:22.431Z  INFO probot: Listening on http://localhost:3000
01:57:22.564Z  INFO probot: Connected https://smee.io/1S10MsoRSjZKWKMt
```

The `dev` script will start your app using [nodemon](https://github.com/remy/nodemon#nodemon), which will watch for any files changes in your local development environment and automatically restart the server.

## Configuring a GitHub App

To automatically configure your GitHub App, follow these steps:

1. Run the app locally by running `npm run dev`.
1. Next follow instructions to visit localhost:3000 (or your custom Glitch URL).
1. You should see something like this: <img width="625" alt="screen shot 2018-09-25 at 10 01 28 pm" src="https://user-images.githubusercontent.com/13410355/46052950-a19e2900-c10e-11e8-9e7e-0c803b8ca35c.png">
1. Go ahead and click the **Register a GitHub App** button.
1. Next you'll get to decide on an app name that isn't already taken.
1. After registering your GitHub App, you'll be redirected to install the app on any repos. At the same time, you can check your local `.env` and notice it will be populated with values GitHub sends us in the course of that redirect.
1. Install the app on a test repo and try triggering a webhook to activate the bot!
1. You're all set! Head down to [Debugging](#debugging) to learn more about developing your Probot App.

GitHub App Manifests--otherwise known as easy app creation--make it simple to generate all the settings necessary for a GitHub App. This process abstracts the [Configuring a GitHub App](#configuring-a-github-app) section. You can learn more about how GitHub App Manifests work and how to change your settings for one via the [GitHub Developer Docs](https://developer.github.com/apps/building-github-apps/creating-github-apps-from-a-manifest/).

## Manually Configuring a GitHub App

> If you created an App with a manifest, you can skip this section; your app is already configured! If you ever need to edit those settings, you can visit `https://github.com/settings/apps/your-app-name`

To run your app in development, you will need to configure a GitHub App to deliver webhooks to your local machine.

1. On your local machine, copy `.env.example` to `.env`.
1. Go to [smee.io](https://smee.io) and click **Start a new channel**. Set `WEBHOOK_PROXY_URL` in `.env` to the URL that you are redirected to.
1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Webhook URL**: Use your `WEBHOOK_PROXY_URL` from the previous step.
    - **Webhook Secret:** `development` (Note: For optimal security, Probot apps **require** this secret be set, even though it's optional on GitHub.).
    - **Permissions & events** is located lower down the page and will depend on what data you want your app to have access to. Note: if, for example, you only enable issue events, you will not be able to listen on pull request webhooks with your app. However, for development we recommend enabling everything.
1. Download the private key and move it to your project's directory. As long as it's in the root of your project, Probot will find it automatically regardless of the filename.
1. Edit `.env` and set `APP_ID` to the ID of the app you just created. The App ID can be found in your app settings page here <img width="1048" alt="screen shot 2017-08-20 at 8 31 31 am" src="https://user-images.githubusercontent.com/5713670/42248717-f6bf4f10-7edb-11e8-8dd5-387181c771bc.png">

## Installing the app on a repo

You'll need to create a test repository and install your app by clicking the "Install" button on the settings page of your app, e.g. `https://github.com/apps/your-app`

**Other available scripts**
* `$ npm start` to start your app without watching files.
* `$ npm run lint` to lint your code using [standard](https://www.npmjs.com/package/standard).

## Debugging

1. Always run `$ npm install` and restart the server if `package.json` has changed.
1. To turn on verbose logging, start server by running: `$ LOG_LEVEL=trace npm start`

## Alternate way of running a probot app

If you take a look to the `npm start` script, this is what it runs: `probot run ./index.js`. This is nice, but you sometimes need more control on how your Node.js application is executed. For example if you want to use custom V8 flags, `ts-node`, etc. you need more flexibility. In those cases there's a simple way of executing your probot application programmatically:

```js
// main.js
const { Probot } = require('probot')
const app = require('./index.js')

// pass a probot app as a function
Probot.run(app)
```

Now you can run `main.js` however you want.
