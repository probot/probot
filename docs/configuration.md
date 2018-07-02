---
next: docs/deployment.md
---

# Environment Configuration

When developing a Probot App, you will need to have several different fields in a `.env` file which specify environment variables. Here are some common use cases:

Variable | Description
---|---
`WEBHOOK_PROXY_URL` | Allows your local development environment to receive GitHub webhook events. Go to https://smee.io/new to get started. **Required**
`WEBHOOK_SECRET` | The webhook secret used when creating a GitHub App. 'development' is used as a default, but the value in `.env` needs to match the value configured in your App settings on GitHub. **Required**
`APP_ID` | 1234 | The App ID assigned to your GitHub App **Required**
`PRIVATE_KEY` | Private key; however, this variable is optional, if it is not present Probot will look in your project's directory for the private key, specifically a file ending in `.pem`. Having a private key somewhere _is_ necessary to run your Probot App. **Required** if `PRIVATE_KEY_PATH` is not set.
`PRIVATE_KEY_PATH` | Path to your private key, a `.pem` file. This is only necessary if your private key is not in your project directory. **Required** if `PRIVATE_KEY` is not set.

For more on the set up of these items, check out [Configuring a GitHub App](https://probot.github.io/docs/development/#configuring-a-github-app).

Some less common environment variables are:

Variable | Description
---|---
`LOG_LEVEL` | The default log level is `info`, but you can also change it to `trace`, `debug`, or `warn`. This affects the verbosity of the logging Probot provides when running your app.
`IGNORED_ACCOUNTS` | Specific to the probot/stats endpoint which fuels the data about each Probot App for our website. By marking an account as ignored, that account will not be included in data collected on the website. The primary use case for this is spammy or abusive users that the GitHub API sends us but who 404.
`DISABLE_STATS` | Allows for Probot Apps to opt out of inclusion in the /stats endpoint which gathers data about each app. For example: `true`
`GHE_HOST` | 'fake.github-enterprise.com' | Allows for a Probot App to be run on a GitHub Enterprise instance.
`PORT` | The port on which Probot will start a local server on. By default, this is `3000`.
`WEBHOOK_PATH` | The URL path which will recieve webhooks. By default, this is `/`.
`SENTRY_DSN` | Logs all errors to [Sentry](https://sentry.io/) for error tracking.
`LOG_FORMAT` | By default, logs are formatted for readability in development. If you intend to drain logs to a logging service, use this option.


For more information on the formatting conventions and rules of `.env` files, check out [the npm `dotenv` module's documentation](https://www.npmjs.com/package/dotenv#rules).
