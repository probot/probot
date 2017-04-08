# Development

To run a plugin locally, you'll need to create a GitHub Integration and configure it to deliver webhooks to your local machine.

1. Make sure you have a recent version of [Node.js](https://nodejs.org/) installed
1. Install [ngrok](https://ngrok.com/download) (`$ brew cask install ngrok` on a mac), which will expose the local server to the internet so GitHub can send webhooks
1. Run `$ ngrok http 3000` to start ngrok, which should output something like `Forwarding https://4397efc6.ngrok.io -> localhost:3000`
1. [Create a new GitHub Integration](https://github.com/settings/integrations/new) with:
    - **Callback URL** and **Webhook URL**: The full ngrok url above. For example: `https://4397efc6.ngrok.io/`
    - **Webhook Secret:** `development`
    - **Permissions & events** needed will depend on how you use the bot, but for development it may be easiest to enable everything.
1. Download the private key and move it to the project directory
1. Edit `.env` and set `INTEGRATION_ID` to the ID of the integration you just created.
1. With `ngrok` still running, open another terminal and run `$ npm start` to start the server on http://localhost:3000

You'll need to create a test repository and install your Integration by clicking the "Install" button on the settings page.

Whenever you com back to work on the app after you've already had it running once, then you need to:

1. Run `$ npm start`
1. Run `$ ngrok http 3000` in another terminal window
1. `ngrok` will use a different URL every time it is restarted, so you will have to go into the [settings for your Integration](https://github.com/settings/integrations) and update all the URLs.

## Debugging

1. Always run `$ npm install` and restart the server if package.json has changed.
1. To turn on verbose logging, start server by running: `$ LOG_LEVEL=trace npm start`
