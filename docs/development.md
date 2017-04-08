# Development

To run a plugin locally, you'll need to create a GitHub Integration and configure it to deliver webhooks to your local machine.

1. Make sure you have a recent version of [Node.js](https://nodejs.org/) installed
1. [Create a new GitHub Integration](https://github.com/settings/integrations/new) with:
    - **Webhook URL**: Set to `https://example.com/` and we'll update it in a minute.
    - **Webhook Secret:** `development`
    - **Permissions & events** needed will depend on how you use the bot, but for development it may be easiest to enable everything.
1. Download the private key and move it to the project directory
1. Edit `.env` and set `INTEGRATION_ID` to the ID of the integration you just created.
1. Run `$ npm start` to start the server, which will output `Listening on https://yourname.localtunnel.me`;
1. Update the **Webhook URL** in the [integration settings](https://github.com/settings/integrations) to use the `localtunnel.me` URL.

You'll need to create a test repository and install your Integration by clicking the "Install" button on the settings page.

Whenever you com back to work on the app after you've already had it running once, you should only need to run `$ npm start`.

## Debugging

1. Always run `$ npm install` and restart the server if package.json has changed.
1. To turn on verbose logging, start server by running: `$ LOG_LEVEL=trace npm start`
