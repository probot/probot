# Environment Configuration

When developing a Probot App, you will need to have several different fields in a `.env` file which specify environment variables. Here are some common use cases:

```
WEBHOOK_PROXY_URL='https://smee.io/yourcustomurl'
# This is used to allow smee to communicate as your Webhook URL

WEBHOOK_SECRET=development #OPTIONAL
# This is the webhook secret used when creating a GitHub App

APP_ID=1234
# This is the App ID assigned to your GitHub App

PRIVATE_KEY=SECRETS #OPTIONAL
# This is your private key; however, this variable is optional, if it is not present Probot will look in your project's directory for the private key.

PRIVATE_KEY_PATH=/path/to/private/key #OPTIONAL
# This is the path to your private key.
```
For more on the set up of these items, check out [Configuring a GitHub App](https://probot.github.io/docs/development/#configuring-a-github-app).

Some less common environment variables are:

```
LOG_LEVEL=debug #OPTIONAL
# The default log level is `info`, but you can also change it to trace, debug, or warn. This affects the verbosity of the logging Probot provides when running your app.

IGNORED_ACCOUNTS='spammyUser,abusiveUser' #OPTIONAL
# This option is specific to the probot/stats endpoint which fuels the data about each Probot App for our website. By marking an account as ignored, that account will not be included in data collected on the website. The primary use case for this is spammy or abusive users that the GitHub API sends us but who 404.

DISABLE_STATS=true #OPTIONAL
# This option allows for Probot Apps to opt out of inclusion in the /stats endpoint which gathers data about each app.

GHE_HOST='fake.github-enterprise.com' #OPTIONAL
# This allows for a Probot App to be run on a GitHub Enterprise instance.

PORT=3000 #OPTIONAL
# The port on which Probot will start a local server on.

WEBHOOK_PATH='/webhook' #OPTIONAL
# This is the URL path which will recieve webhooks

SENTRY_DSN='https://user:pw@sentry.io/1234' #OPTIONAL
# Logs all errors to Sentry for error tracking.

LOG_FORMAT=json # OPTIONAL
# By default, logs are formatted for readability in development. If you intend to drain logs to a logging service, use this option.
```
