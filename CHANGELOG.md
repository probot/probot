# Changelog

## 0.10.0 (2017-08-24)

Enhancements:

- Configure the path that the GitHub webhook handler listens on with `WEBHOOK_PATH` environment variable or the `--webhook-path` or `-w` command line options ([#203](https://github.com/probot/probot/pull/203))

Breaking Changes:

- Previously, `context.config(path, default)` would raise an error if the config file does not exist in the repository. Now, it will return the `default` from [`context.config`](https://probot.github.io/api/latest/Context.html#config) even if the file doesn't exist, or `null` if a default is not set. ([#198](https://github.com/probot/probot/pull/198), [#201](https://github.com/probot/probot/pull/201))

- Rename `SENTRY_URL` to `SENTRY_DSN`, because consistency ([#194](https://github.com/probot/probot/pull/194))

Noteworthy Community Updates:

- There's a new [Slack channel for Probot](https://probot-slackin.herokuapp.com/). Come chat with us! ([#217](https://github.com/probot/probot/pull/216))

- [Standard](https://standardjs.com/) is the new lint sheriff in town and recommended for all Probot apps. ([#219](https://github.com/probot/probot/pull/219))

- Welcome to [@hiimbex](https://github.com/hiimbex), [@JasonEtco](https://github.com/JasonEtco), and [@anglinb](https://github.com/anglinb) as maintainers!

- Update terminology to use "Probot app" instead of "Probot plugin", and "Probot extension" instead of "Probot helper" ([#210](https://github.com/probot/probot/pull/210))

## 0.9.1 (2017-08-09)

Enhancements:

- Log the event with errors to aid debugging ([#196](https://github.com/probot/probot/pull/196))

- Reduce the ttl on the auth token cache to 1 min less than GitHub expiry ([#197](https://github.com/probot/probot/pull/197))

[View full changelog](https://github.com/probot/probot/compare/v0.9.0...v0.9.1)

## 0.9.0 (2017-08-06)

Enhancements:

- Use Express for the web server and allow plugins add routes. See the [docs for adding HTTP routes](https://github.com/probot/probot/blob/master/docs/plugins.md#http-routes). ([#183](https://github.com/probot/probot/pull/183))

- Add second argument to `context.config` for defaults. ([#186](https://github.com/probot/probot/pull/186))

- Published [create-probot-plugin](https://github.com/probot/create-probot-plugin) as the standard way of creating new Probot plugins.

Breaking Changes:

- The `INTEGRATION_ID` environment variable was deprecated in 0.6 and has been removed ([#189](https://github.com/probot/probot/pull/189))

[View full changelog](https://github.com/probot/probot/compare/v0.8.0...v0.9.0)

## 0.8.0 (2017-07-27)

Enhancements:

- Add helper for loading config from a repository ([#141](https://github.com/probot/probot/pull/141))
- Add `probot simulate` command for simulating the delivery of a webhook ([#136](https://github.com/probot/probot/pull/136))

[View full changelog](https://github.com/probot/probot/compare/v0.7.5...v0.8.0)

## 0.7.5 (2017-07-13)

Fixes:

- Line breaks in the `PRIVATE_KEY` environment variable are now replaced.

[View full changelog](https://github.com/probot/probot/compare/v0.7.4...v0.7.5)

## 0.7.4 (2017-06-30)

Fixes:

- This fixes a bug introduced in [#165](https://github.com/probot/probot/pull/165) and adds a test to show that webhook delivery is happening. ([#168](https://github.com/probot/probot/pull/168))

[View full changelog](https://github.com/probot/probot/compare/v0.7.3...v0.7.4)

## 0.7.3 (2017-06-30)

Enhancements:

- Refactor some internals to improve the testability of plugins. Docs coming soon after building out tests for several of the plugins.

[View full changelog](https://github.com/probot/probot/compare/v0.7.2...v0.7.3)

## 0.7.2 (2017-06-27)

- Internal: update from `github-integration` to renamed `github-app` for handling GitHub App authentication.

[View full changelog](https://github.com/probot/probot/compare/v0.7.1...v0.7.2)

## 0.7.1 (2017-06-16)

Fixes:

- Fix error introduced in 0.7.0 that was preventing events from being received. ([#161](https://github.com/probot/probot/pull/161))

[View full changelog](https://github.com/probot/probot/compare/v0.7.0...v0.7.1)

## 0.7.0 (2017-06-15)

Breaking Changes:

- Callbacks passed to `robot.on` used to take two arguments—`event` and `context`. The second was pretty much just a fancy version of the first, and you really need the second to do anything useful, so the first argument has been dropped. (Technically, the second is passed as both arguments for now to preserve backward compatibility, but this won't be the case forever, so go update your plugins). You will see this warning when loading plugins:

    ```
    DEPRECATED: Event callbacks now only take a single `context` argument.
    at module.exports.robot (/path/to/your/plugin.js:3:9)
    ```

    Before:

    ```js
    robot.on('issues.opened', async (event, context) => {
      log('Event and context? What is the difference?', events, context);
    });
    ```

    After:

    ```js
    robot.on('issues.opened', async context => {
      log('Sweet, just one arg', context, context.payload);
    });
    ```

Enhancements:

- Fix issue where localtunnel would often not reconnect when you restart the probot process. ([#157](https://github.com/probot/probot/pull/157))


[View full changelog](https://github.com/probot/probot/compare/v0.6.0...v0.7.0)

## v0.6.0 (2017-06-09)

Breaking Changes:

- Update to [node-github](https://github.com/mikedeboer/node-github) v9, which namespaces all responses with a `data` attribute. (https://github.com/mikedeboer/node-github/pull/505). This is likely to be a breaking change for all plugins.

    Before:

    ```js
    const data = await github.search.issues(params);
    data.items.forEach(item => doTheThing(issue));
    ```

    After:

    ```js
    const res = await github.search.issues(params);
    res.data.items.forEach(item => doTheThing(issue));
    ```

- "GitHub Integrations" were renamed to "GitHub Apps". The `INTEGRATION_ID` environment variable has been deprecated. Use `APP_ID` instead. ([#154](https://github.com/probot/probot/pull/154))

Enhancements:

- Errors thrown in handlers from plugins were being silently ignored. That's not cool. Now, they're being caught and logged.
 ([#152](https://github.com/probot/probot/pull/152))

[View full changelog](https://github.com/probot/probot/compare/v0.5.0...v0.6.0)
