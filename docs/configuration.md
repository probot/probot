---
next: docs/deployment.md
---

# Environment Configuration

When developing a Probot App, you will need to have several different fields in a `.env` file which specify environment variables. Here are some common use cases:

Variable | Description
---|---
`APP_ID` | The App ID assigned to your GitHub App. **Required** <p>_(Example: `1234`)_</p>
**Private Key Options** | One of the following is **Required** if there is no `.pem` file in your project's root directory
`PRIVATE_KEY_PATH` | The path to the `.pem` file for your GitHub App. <p>_(Example: `path/to/key.pem`)_</p>
`PRIVATE_KEY` | The contents of the private key for your GitHub App. If you're unable to use multiline environment variables, use base64 encoding to convert the key to a single line string. See the [Deployment](./deployment) docs for provider specific usage. | 
**Webhook Options** | 
`WEBHOOK_PROXY_URL` | Allows your local development environment to receive GitHub webhook events. Go to https://smee.io/new to get started. <p>_(Example: `https://smee.io/your-custom-url`)_</p>
`WEBHOOK_SECRET` | The webhook secret used when creating a GitHub App. 'development' is used as a default, but the value in `.env` needs to match the value configured in your App settings on GitHub. Note: GitHub marks this value as optional, but for optimal security it's required for Probot apps. **Required** <p>_(Example: `development`)_</p>

For more on the set up of these items, check out [Configuring a GitHub App](https://probot.github.io/docs/development/#configuring-a-github-app).

Some less common environment variables are:

Variable | Description
---|---
`DISABLE_STATS` | Set to `true` to disable the the `/probot/stats` endpoint, which gathers data about each app. Recommend for apps with a lot of installations. <p>_(Example: `true`)_</p>
`GHE_HOST` | The hostname of your GitHub Enterprise instance. <p>_(Example: `github.mycompany.com`)_</p>
`IGNORED_ACCOUNTS` | A comma-separated list of GitHub account names to ignore. This is currently used by the `/probot/stats`. By marking an account as ignored, that account will not be included in data collected on the website. The primary use case for this is spammy or abusive users that the GitHub API sends us but who 404. <p>_(Example: `spammyPerson,abusiveAccount`)_</p>
`LOG_FORMAT` | By default, logs are formatted for readability in development. You can set this to `short`, `long`, `simple`, `json`, `bunyan`. Default: `short`
`LOG_LEVEL` | The verbosity of logs to show when running your app, which can be `trace`, `debug`, `info`, `warn`, `error`, or `fatal`. Default: `info`
`PORT` | The port to start the local server on. Default: `3000`.
`SENTRY_DSN` | Set to a [Sentry](https://sentry.io/) DSN to report all errors thrown by your app.  <p>_(Example: `https://1234abcd@sentry.io/12345`)_</p>
`WEBHOOK_PATH` | The URL path which will recieve webhooks. Default: `/`.
`INSTALLATION_TOKEN_TTL` | The length of time installation access tokens are cached by Probot. This may be useful if your app is running long processes before accessing `context.github`. Default: `3540` (59 minutes) <p>_(Example: `3300` or 55 minutes)_</p>

For more information on the formatting conventions and rules of `.env` files, check out [the npm `dotenv` module's documentation](https://www.npmjs.com/package/dotenv#rules).
