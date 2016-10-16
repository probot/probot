# Contributing

## Running Locally


0. Clone the repository with `git clone https://github.com/bkeepers/PRobot.git`
0. Make sure you have a recent version of [Node.js](https://nodejs.org/) installed
0. Run `$ script/bootstrap` to install all the project dependencies
0. Install [ngrok](https://ngrok.com/download) (`$ brew cask install ngrok` on a mac), which will expose the local server to the internet so GitHub can send webhooks
0. Run `$ ngrok http 3000`, which should output something like `Forwarding http://4397efc6.ngrok.io -> localhost:3000`
0. [Register an integration](https://developer.github.com/early-access/integrations/creating-an-integration/) on GitHub with:
  - **Homepage URL**, **Callback URL**, and **Webhook URL**: The full ngrok url above. For example: `http://4397efc6.ngrok.io/`
  - **Secret:** `development`
  - **Permissions & events** needed will depend on how you use the bot, but for development it may be easiest to enable everything.
0. Download the private key and move it to `private-key.pem` in the project directory
0. Edit `.env` and fill in all the environment variables
0. With `ngrok` still running, open another terminal and run `$ script/server` to start the server on http://localhost:3000

Whenever you com back to work on the app after you've already had it running once, then you need to:

0. Run `$ script/server`
0. Run `$ ngrok http 3000`
0. `ngrok` will use a different URL every time it is restarted, so you will have to go into the [settings for your Integration](https://github.com/settings/installations) and update all the URLs


## Testing

To test with a real GitHub repository, you'll need to create a test repository and install the integration you created above:

0. Open up the settings for you installation and click "Install"
0. Create a `.probot.yml` in your repository with:
        behaviors:
        - on: issues.opened
          then:
            comment: "Hello World! Your bot is working!"
0. Open a new issue. Your bot should post a comment (you may need to refresh to see it).

## Debugging

0. To see what requests are going out, enable debugging mode for  GitHub client in `/server.js`:

        const github = new GitHubApi({
          debug: true
        });
0. Always run `$ script/bootstrap` and restart the server if package.json has changed.
