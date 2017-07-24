# Development

To run a plugin locally, you'll need to create a GitHub App and configure it to deliver webhooks to your local machine.

1. Make sure you have a recent version of [Node.js](https://nodejs.org/) installed
1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Webhook URL**: Set to `https://example.com/` and we'll update it in a minute.
    - **Webhook Secret:** `development`
    - **Permissions & events** needed will depend on how you use the bot, but for development it may be easiest to enable everything.
1. Download the private key and move it to the project directory
1. Edit `.env` and set `APP_ID` to the ID of the app you just created.
1. Run `$ npm start` to start the server, which will output `Listening on https://yourname.localtunnel.me`;
1. Update the **Webhook URL** in the [app settings](https://github.com/settings/apps) to use the `localtunnel.me` URL.

You'll need to create a test repository and install your app by clicking the "Install" button on the settings page of your app.

Whenever you come back to work on the app after you've already had it running once, you should only need to run `$ npm start`.

Optionally, you can also run your plguin through [nodemon](https://github.com/remy/nodemon#nodemon) which will listen on any files changes in your local development environment and automatically restart the server. After installing nodemon, you can run `nodemon --exec "npm start"` and from there the server will automatically restart upon file changes.

## Debugging

1. Always run `$ npm install` and restart the server if package.json has changed.
1. To turn on verbose logging, start server by running: `$ LOG_LEVEL=trace npm start`
