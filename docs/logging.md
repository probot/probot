---
next: docs/deployment.md
title: Logging
---

# Logging

Probot comes with [`pino`](https://getpino.io), a minimal logging library that outputs [newline delimited JSON](http://ndjson.org/). Probot uses [`pino-pretty`](https://github.com/pinojs/pino-pretty) for more readbale formatting during development and [`@probot/pino`](https://github.com/probot/pino/) which supports error reporting to Sentry by configuring the `SENTRY_DSN` environment variable.

`app.log`, `context.log` in an event handler, and `req.log` in an HTTP request are all loggers that you can use to get more information about what your app is doing.

```js
module.exports = (app, { getRouter }) => {
  app.log.info("Yay, my app is loaded");

  app.on("issues.opened", (context) => {
    if (context.payload.issue.body.match(/bacon/)) {
      context.log.info("This issue is about bacon");
    } else {
      context.log.info("Sadly, this issue is not about bacon");
    }
  });

  const router = getRouter("/my-app");
  router.get("/hello-world", (req, res) => {
    req.log.info("Someone is saying hello");
    res.send("Hello World");
  });
};
```

When you start up your Probot app you should see your log message appear in your terminal.

Occasionally you will want to log more detailed information that is useful for debugging, but you might not want to see it all the time.

```js
module.exports = (app) => {
  // …
  app.log.trace("Really low-level logging");
  app.log.debug({ data: "here" }, "End-line specs on the rotary girder");
  app.log.info("Same as using `app.log`");

  const err = new Error("Some error");
  app.log.warn(err, "Uh-oh, this may not be good");
  app.log.error(err, "Yeah, it was bad");
  app.log.fatal(err, "Goodbye, cruel world!");
};
```

By default, messages that are `info` and above will show in your logs, but you can change it by setting the
`LOG_LEVEL` environment variable to `trace`, `debug`, `info`, `warn`, `error`, or `fatal` in `.env` or on the command line.

```
$ LOG_LEVEL=debug npm start
```

## Log formats

In development, it's nice to see simple, colorized, pretty log messages. But those pretty messages don't do you any good when you have 2TB of log files and you're trying to track down why that one-in-a-million bug is happening in production.

When `NODE_ENV` is set (as it should be in production), the log output is structured JSON, which can then be drained to a logging service that allows querying by various attributes.

For example, given this log:

```js
module.exports = (app) => {
  app.on("issue_comment.created", (context) => {
    context.log.info("Comment created");
  });
};
```

You'll see this output:

```
{"name":"Probot","hostname":"Brandons-MacBook-Pro-3.local","pid":96993,"event":{"id":"afdcb370-c57d-11e7-9b26-0f31120e45b8","event":"issue_comment","action":"created","repository":"robotland/test","installation":13055},"level":30,"msg":"Comment created","time":"2017-11-09T18:42:07.312Z","v":0}
```

The output can then be piped to one of [pino's transport tools](https://getpino.io/#/docs/transports), or you can build your own.
