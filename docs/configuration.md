---
next: docs/deployment.md
---

# Environment Configuration

When developing a Probot App, you will need to have several different fields in a `.env` file which specify environment variables. Here are some common use cases:

Variable | Description
---|---
`APP_ID` | The App ID assigned to your GitHub App. **Required**
`PRIVATE_KEY_PATH` | The path to the `.pem` file for your GitHub App. If not present, Probot will look for a file ending in `.pem` in your project's directory. **Required** if the `.pem` file is not in your project directory and `PRIVATE_KEY` is not set.
`PRIVATE_KEY` | The contents of the private key for your GitHub App. **Required** if the `.pem` file is not in your project directory and `PRIVATE_KEY_PATH` is not set.
`WEBHOOK_PROXY_URL` | Allows your local development environment to receive GitHub webhook events. Go to https://smee.io/new to get started.
`WEBHOOK_SECRET` | The webhook secret used when creating a GitHub App. 'development' is used as a default, but the value in `.env` needs to match the value configured in your App settings on GitHub. **Required**

For more on the set up of these items, check out [Configuring a GitHub App](https://probot.github.io/docs/development/#configuring-a-github-app).

Some less common environment variables are:

Variable | Description
---|---
`DISABLE_STATS` | Set to `true` to disable the the `/probot/stats` endpoint, which gathers data about each app. Recommend for apps with a lot of installations.
`GHE_HOST` | The hostname of your GitHub Enterprise instance, such as  `github.mycompany.com`.
`IGNORED_ACCOUNTS` | A comma-separated list of GitHub account names to ignore. This is currently used by the `/probot/stats`. By marking an account as ignored, that account will not be included in data collected on the website. The primary use case for this is spammy or abusive users that the GitHub API sends us but who 404.
`LOG_FORMAT` | By default, logs are formatted for readability in development. You can set this to `short`, `long`, `simple`, `json`, `bunyan`. Default: `short`
`LOG_LEVEL` | The verbosity of logs to show when running your app, which can be `trace`, `debug`, `info`, `warn`, `error`, or `fatal`. Default: `info`
`PORT` | The port to start the local server on. Default: `3000`.
`SENTRY_DSN` | Set to a [Sentry](https://sentry.io/) DSN to report all errors thrown by your app.
`WEBHOOK_PATH` | The URL path which will recieve webhooks. Default: `/`.

For more information on the formatting conventions and rules of `.env` files, check out [the npm `dotenv` module's documentation](https://www.npmjs.com/package/dotenv#rules).
