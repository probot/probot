---
next: docs/webhooks.md
---

# Developing an App

To develop a Probot app, you will first need a recent version of [Node.js](https://nodejs.org/) installed. Probot uses the `async/await` keywords, so Node.js 7.6 is the minimum required version.

## Generating a new app

[create-probot-app](https://github.com/probot/create-probot-app) is the best way to start building a new app. It will generate a new app with everything you need to get started and run your app in production.

To get started, run one of these commands:

- If you're using npm: `$ npx create-probot-app my-first-app`
- or, if you're using Yarn: `$ yarn create probot-app my-first-app`

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
created file: my-first-app/.env.example
created file: my-first-app/.gitignore
created file: my-first-app/.travis.yml
created file: my-first-app/LICENSE
created file: my-first-app/README.md
created file: my-first-app/app.json
created file: my-first-app/index.js
created file: my-first-app/package-lock.json
created file: my-first-app/package.json
created file: my-first-app/docs/deploy.md
Finished scaffolding files!

Installing Node dependencies!

Done! Enjoy building your Probot app!
```

The most important files note here are `index.js`, which is where the code for your app will go, and `package.json`, which makes this a standard [npm module](https://docs.npmjs.com/files/package.json).

## Configure a GitHub App

To run your app in development, you will need to configure a GitHub App to deliver webhooks to your local machine.

1. On your local machine, copy `.env.example` to `.env`.
1. Go to [smee.io](https://smee.io) and click **Start a new channel**. Set `WEBHOOK_PROXY_URL` in `.env` to the URL that you are redirected to.
1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Webhook URL**: Use your `WEBHOOK_PROXY_URL` from the previous step.
    - **Webhook Secret:** `development`
    - **Permissions & events** is located lower down the page and will depend on what data you want your app to have access to. Note: if, for example, you only enable issue events, you will not be able to listen on pull request webhooks with your app. However, for development we recommend enabling everything.
1. Download the private key and move it to your project's directory. It will get picked up by Probot automatically.
1. Edit `.env` and set `APP_ID` to the ID of the app you just created. The App ID can be found in your app settings page here <img width="1048" alt="screen shot 2017-08-20 at 8 31 31 am" src="https://user-images.githubusercontent.com/13410355/29496168-044b9a48-8582-11e7-8be4-39cc75090647.png">
1. Run `$ npm start` to start the server/

You'll need to create a test repository and install your app by clicking the "Install" button on the settings page of your app.

## Running the app

Once you've set the `APP_ID` of your GitHub app in `.env` and downloaded the private key, you're ready to run your app.

```
$ npm start
> probot run ./index.js

Yay, the plugin was loaded!
18:11:55.838Z DEBUG Probot: Loaded plugin: ./index.js
```

Optionally, you can also run your app through [nodemon](https://github.com/remy/nodemon#nodemon) which will listen on any files changes in your local development environment and automatically restart the server. After installing nodemon, you can run `nodemon --exec "npm start"` and from there the server will automatically restart upon file changes.

## Debugging

1. Always run `$ npm install` and restart the server if `package.json` has changed.
1. To turn on verbose logging, start server by running: `$ LOG_LEVEL=trace npm start`
