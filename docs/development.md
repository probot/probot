---
next: docs/webhooks.md
---

# Developing a Plugin

To develop a Probot plugin, you will first need a recent version of [Node.js](https://nodejs.org/) installed. Probot uses the `async/await` keywords, so Node.js 7.6 is the minimum required version.

## Generating a new plugin

[create-probot-plugin](https://github.com/probot/create-probot-plugin) is the best way to start building a new plugin. It will generate a new plugin with everything you need to get started and run your plugin in production.

To get started, install the module from npm:

```
$ npm install -g create-probot-plugin
```

Next, run the app:

```
$ create-probot-plugin my-first-plugin
```

This will ask you a series of questions about your plugin, which should look something like this:

```
Let's create a Probot plugin!
? Plugin's package name: my-first-plugin
? Description of plugin: A "Hello World" GitHub App built with Probot
? Plugin author's full name: Brandon Keepers
? Plugin author's email address: bkeepers@github.com
? Plugin author's homepage:
? Plugin's GitHub user or org name: bkeepers
? Plugin's repo name: my-first-plugin
created file: my-first-plugin/.env.example
created file: my-first-plugin/.gitignore
created file: my-first-plugin/.travis.yml
created file: my-first-plugin/LICENSE
created file: my-first-plugin/README.md
created file: my-first-plugin/app.json
created file: my-first-plugin/index.js
created file: my-first-plugin/package-lock.json
created file: my-first-plugin/package.json
created file: my-first-plugin/docs/deploy.md
Done!
```

The most important files note here are `index.js`, which is where the code for your plugin will go, and `package.json`, which makes this a standard [npm module](https://docs.npmjs.com/files/package.json).

## Configure a GitHub App

To run your plugin in development, you will need to configure a GitHub App to deliver webhooks to your local machine.

1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Webhook URL**: Set to `https://example.com/` and we'll update it in a minute.
    - **Webhook Secret:** `development`
    - **Permissions & events** needed will depend on how you use the bot, but for development it may be easiest to enable everything.
1. Download the private key and move it to the project directory
1. Edit `.env` and set `APP_ID` to the ID of the app you just created.
1. Run `$ npm start` to start the server, which will output `Listening on https://yourname.localtunnel.me`;
1. Update the **Webhook URL** in the [app settings](https://github.com/settings/apps) to use the `localtunnel.me` URL.

You'll need to create a test repository and install your app by clicking the "Install" button on the settings page of your app.

## Running the plugin

Once you've set the `APP_ID` of your GitHub app in `.env` and downloaded the  private key, you're ready to run your bot.

```
$ npm start
> probot run ./index.js

Yay, the plugin was loaded!
18:11:55.838Z DEBUG PRobot: Loaded plugin: ./index.js
Listening on https://bkeepers.localtunnel.me
```

Optionally, you can also run your plugin through [nodemon](https://github.com/remy/nodemon#nodemon) which will listen on any files changes in your local development environment and automatically restart the server. After installing nodemon, you can run `nodemon --exec "npm start"` and from there the server will automatically restart upon file changes.

## Debugging

1. Always run `$ npm install` and restart the server if `package.json` has changed.
1. To turn on verbose logging, start server by running: `$ LOG_LEVEL=trace npm start`
