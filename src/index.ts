export type { Logger } from "pino";

export { Context } from "./context.js";

export { Probot } from "./probot.js";
export { Server } from "./server/server.js";
export { ProbotOctokit } from "./octokit/probot-octokit.js";
export { run } from "./run.js";
export { createNodeMiddleware } from "./create-node-middleware.js";
export { createProbot } from "./create-probot.js";

/** NOTE: exported types might change at any point in time */
export type {
  Options,
  ApplicationFunction,
  ApplicationFunctionOptions,
} from "./types.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The App ID assigned to your GitHub App.
       * @example '1234'
       */
      APP_ID?: string;

      /**
       * By default, logs are formatted for readability in development. You can
       * set this to `json` in order to disable the formatting.
       */
      LOG_FORMAT?: "json" | "pretty";

      /**
       * The verbosity of logs to show when running your app, which can be
       * `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`.
       * @default 'info'
       */
      LOG_LEVEL?:
        | "trace"
        | "debug"
        | "info"
        | "warn"
        | "error"
        | "fatal"
        | "silent";

      /**
       * By default, when using the `json` format, the level printed in the log
       * records is an int (`10`, `20`, ..). This option tells the logger to
       * print level as a string: `{"level": "info"}`. Default `false`
       */
      LOG_LEVEL_IN_STRING?: "true" | "false";

      /**
       * Only relevant when `LOG_FORMAT` is set to `json`. Sets the json key for the log message.
       * @default 'msg'
       */
      LOG_MESSAGE_KEY?: string;

      /**
       * The organization where you want to register the app in the app
       * creation manifest flow. If set, the app is registered for an
       * organization
       * (https://github.com/organizations/ORGANIZATION/settings/apps/new), if
       * not set, the GitHub app would be registered for the user account
       * (https://github.com/settings/apps/new).
       */
      GH_ORG?: string;

      /**
       * The hostname of your GitHub Enterprise instance.
       * @example github.mycompany.com
       */
      GHE_HOST?: string;

      /**
       * The protocol of your GitHub Enterprise instance. Defaults to HTTPS.
       * Do not change unless you are certain.
       * @default 'https'
       */
      GHE_PROTOCOL?: string;

      /**
       * The contents of the private key for your GitHub App. If you're unable
       * to use multiline environment variables, use base64 encoding to
       * convert the key to a single line string. See the Deployment docs for
       * provider specific usage.
       */
      PRIVATE_KEY?: string;

      /**
       * When using the `PRIVATE_KEY_PATH` environment variable, set it to the
       * path of the `.pem` file that you downloaded from your GitHub App registration.
       * @example 'path/to/key.pem'
       */
      PRIVATE_KEY_PATH?: string;
      /**
       * The port to start the local server on.
       * @default '3000'
       */
      PORT?: string;

      /**
       * The host to start the local server on.
       */
      HOST?: string;

      /**
       * Set to a `redis://` url as connection option for
       * [ioredis](https://github.com/luin/ioredis#connect-to-redis) in order
       * to enable
       * [cluster support for request throttling](https://github.com/octokit/plugin-throttling.js#clustering).
       * @example 'redis://:secret@redis-123.redislabs.com:12345/0'
       */
      REDIS_URL?: string;

      /**
       * Set to a [Sentry](https://sentry.io/) DSN to report all errors thrown
       * by your app.
       * @example 'https://1234abcd@sentry.io/12345'
       */
      SENTRY_DSN?: string;

      /**
       * The URL path which will receive webhooks.
       * @default '/api/github/webhooks'
       */
      WEBHOOK_PATH?: string;

      /**
       * Allows your local development environment to receive GitHub webhook
       * events. Go to https://smee.io/new to get started.
       * @example 'https://smee.io/your-custom-url'
       */
      WEBHOOK_PROXY_URL?: string;

      /**
       * **Required**
       * The webhook secret used when creating a GitHub App. 'development' is
       * used as a default, but the value in `.env` needs to match the value
       * configured in your App settings on GitHub. Note: GitHub marks this
       * value as optional, but for optimal security it's required for Probot
       * apps.
       *
       * @example 'development'
       * @default 'development'
       */
      WEBHOOK_SECRET?: string;

      NODE_ENV?: string;
    }
  }
}
