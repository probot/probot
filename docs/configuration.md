---
next: docs/deployment.md
---

# Environment Configuration

When developing a Probot App, you will need to have several different fields in a `.env` file which specify environment variables. Here are some common use cases:

Variable | Sample Value | Required | Description
---|---|---|---
WEBHOOK_PROXY_URL | 'https://smee.io/yourcustomurl'| Required | Allows your local development environment to receive GitHub webhook events. Go to https://smee.io/new to get started.
WEBHOOK_SECRET | development | Optional | The webhook secret used when creating a GitHub App
APP_ID | 1234 | Required | The App ID assigned to your GitHub App
PRIVATE_KEY | SECRETS | Optional | Private key; however, this variable is optional, if it is not present Probot will look in your project's directory for the private key, specifically a file ending in `.pem`. Having a private key somewhere _is_ necessary to run your Probot App.
PRIVATE_KEY_PATH | /path/to/private/key | Optional | Path to your private key, a `.pem` file. This is only necessary if your private key is not in your project directory.

For more on the set up of these items, check out [Configuring a GitHub App](https://probot.github.io/docs/development/#configuring-a-github-app).

Some less common environment variables are:

Variable | Sample Value | Required | Description
---|---|---|---
LOG_LEVEL | debug | Optional | The default log level is `info`, but you can also change it to `trace`, `debug`, or `warn`. This affects the verbosity of the logging Probot provides when running your app.
IGNORED_ACCOUNTS | 'spammyUser,abusiveUser' | Optional | Specific to the probot/stats endpoint which fuels the data about each Probot App for our website. By marking an account as ignored, that account will not be included in data collected on the website. The primary use case for this is spammy or abusive users that the GitHub API sends us but who 404.
DISABLE_STATS | true | Optional | Allows for Probot Apps to opt out of inclusion in the /stats endpoint which gathers data about each app.
GHE_HOST | 'fake.github-enterprise.com' | Optional | Allows for a Probot App to be run on a GitHub Enterprise instance.
PORT | 5000 | Optional | The port on which Probot will start a local server on. By default, this is 3000.
WEBHOOK_PATH | '/webhook' | Optional | The URL path which will recieve webhooks. By default, this is `'/'`.
SENTRY_DSN | 'https://user:pw@sentry.io/1234' | Optional | Logs all errors to [Sentry](https://sentry.io/) for error tracking.
LOG_FORMAT | json |  Optional | By default, logs are formatted for readability in development. If you intend to drain logs to a logging service, use this option.


For more information on the formatting conventions and rules of `.env` files, check out [the npm `dotenv` module's documentation](https://www.npmjs.com/package/dotenv#rules).
