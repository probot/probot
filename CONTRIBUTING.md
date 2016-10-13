# Contributing

## Setup

0. Clone the repo
0. Make sure you have the latest version of [Node.js](https://nodejs.org/) to develop locally.
0. Run `$ script/bootstrap` to install all the project dependencies
0. Until this gets built into a proper [Integration](https://developer.github.com/early-access/integrations/), the bot will need a valid GitHub API token to be able to do anything useful. Create a new [Personal access token](https://github.com/settings/tokens/new) and select the `repo` scope.
0. Re-start the local server with the token by running: `$ GITHUB_TOKEN=xxx script/server` to run the server on http://localhost:3000
0. Download [ngrok](https://ngrok.com/download) (`$ brew cask install ngrok` on a mac), which will expose a local server to the internet.
0. With the server still running, open a new terminal tab and run `ngrok http 3000`, which should output something like `Forwarding http://4397efc6.ngrok.io -> localhost:3000`.

## Testing
To test with a real GitHub repository, you'll need to create a test repository and configure a new webhook:

0. Head over to the **Settings** page of your repository, and click on **Webhooks & services**. Then, click on **Add webhook**. Configure it with:
  - **Payload URL:** Use the full `*.ngrok.io`
  - **Secret:** `development`
  - **Which events would you like to trigger this webhook?:** Choose **Send me everything**.
0. Create a `.probot.yml` in your repo with:

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
