---
next: docs/pagination.md
---

# Logging

A good logger is a good developer's secret weapon. Probot comes with [bunyan](https://github.com/trentm/node-bunyan), which is a simple and fast logging library that supports some pretty sophisticated logging if you need it (hint: you will).

`app.log`, `context.log` in an event handler, and `req.log` in an HTTP request are all loggers that you can use to get more information about what your app is doing.

```js
module.exports = app => {
  app.log('Yay, my app is loaded')

  app.on('issues.opened', context => {
    if (context.payload.issue.body.match(/bacon/)) {
      context.log('This issue is about bacon')
    } else {
      context.log('Sadly, this issue is not about bacon')
    }
  })

  app.route().get('/hello-world', (req, res) => {
    req.log('Someone is saying hello')
  })
}
```

When you start up your app with `npm start`, You should see your log message appear in your terminal.

<img width="753" alt="" src="https://user-images.githubusercontent.com/173/33234904-d43e7f14-d1f3-11e7-8dcb-6c47e58bd56b.png">

`app.log` will log messages at the `info` level, which is what your app should use for most relevant messages. Occasionally you will want to log more detailed information that is useful for debugging, but you might not want to see it all the time.

```js
module.exports = app => {
  // …
  app.log.trace('Really low-level logging')
  app.log.debug({ data: 'here' }, 'End-line specs on the rotary girder')
  app.log.info('Same as using `app.log`')

  const err = new Error('Some error')
  app.log.warn(err, 'Uh-oh, this may not be good')
  app.log.error(err, 'Yeah, it was bad')
  app.log.fatal(err, 'Goodbye, cruel world!')
}
```

By default, messages that are `info` and above will show in your logs, but you can change it by setting the
`LOG_LEVEL` environment variable to `trace`, `debug`, `info`, `warn`, `error`, or `fatal` in `.env` or on the command line.

```
$ LOG_LEVEL=debug npm start
```

### Log formats

In development, it's nice to see simple, colorized, pretty log messages. But those pretty messages don't do you any good when you have 2TB of log files and you're trying to track down why that one-in-a-million bug is happening in production.

Set `LOG_FORMAT=json` to show log messages as structured JSON, which can then be drained to a logging service that allows querying by various attributes.

For example, given this log:

```js
module.exports = app => {
  app.on('issue_comment.created', context => {
    context.log('Comment created')
  })
}
```

You'll see this output:

```
{"name":"Probot","hostname":"Brandons-MacBook-Pro-3.local","pid":96993,"event":{"id":"afdcb370-c57d-11e7-9b26-0f31120e45b8","event":"issue_comment","action":"created","repository":"robotland/test","installation":13055},"level":20,"msg":"Comment created","time":"2017-11-09T18:42:07.312Z","v":0}
```

For more about bunyan, check out [this talk about logging in production](http://trentm.com/talk-bunyan-in-prod/).
