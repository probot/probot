## Change Log

### v0.5.0 (2017-05-04)
- [#134](https://github.com/probot/probot/pull/134) Add three laws & empathy to [best practices](https://github.com/probot/probot/blob/master/docs/best-practices.md) doc (@bkeepers)
- [#105](https://github.com/probot/probot/pull/105) Use jsdoc to generate [API documentation](https://probot.github.io/probot/latest/) (@bkeepers)
- [#132](https://github.com/probot/probot/pull/132) Include the authenticated github client in `context.github` (@bkeepers)
    ```js
    module.exports = robot => {
      robot.on('issues.opened', async (event, context) => {
        return context.github.issues.createComment(context.issue({
          body: "hello"
        }));
      });
    }
    ```
- [#127](https://github.com/probot/probot/pull/127) add `PRIVATE_KEY_PATH` env var support (@boneskull)
- [#123](https://github.com/probot/probot/pull/123) enable autodiscovery of plugins. If no plugins are passed to `probot run`, then they are automatically discovered. (@boneskull)
- [#114](https://github.com/probot/probot/pull/114) Documentation for for [deploying plugins](https://github.com/probot/probot/blob/master/docs/deployment.md) (@bkeepers)

### v0.4.1 (2017-04-08)
- [#117](https://github.com/probot/probot/pull/117) Logs to Sentry (@bkeepers)
- [#118](https://github.com/probot/probot/pull/118) Ensure node version is satisfied (@bkeepers)

### v0.4.0 (2017-04-08)
- [#119](https://github.com/probot/probot/pull/119) replace ngrok with localtunnel (@bkeepers)

### v0.3.3 (2017-04-08)
- [#116](https://github.com/probot/probot/pull/116) Look for any `.pem` file (@bkeepers)

### v0.3.1 (2017-04-05)
- [#113](https://github.com/probot/probot/pull/113) Start documenting best practices (@lee-dohm, @bkeepers)
- [#111](https://github.com/probot/probot/pull/111) Add raven to report errors to sentry (@bkeepers)
- [#112](https://github.com/probot/probot/pull/112) Update paginate to default to returning response (@bkeepers)

### v0.3.0 (2017-03-31)
- [#110](https://github.com/probot/probot/pull/110) Integrate pagination support into Probot core (@bkeepers, @lee-dohm)

### v0.2.1 (2017-03-28)
- [#109](https://github.com/probot/probot/pull/109) Hack to throttle requests (@bkeepers)
- [#108](https://github.com/probot/probot/pull/108) Add cache (@bkeepers)
- [#106](https://github.com/probot/probot/pull/106) Update xo to the latest version 🚀 (@greenkeeper[bot])
- [#104](https://github.com/probot/probot/pull/104) Doc updates (@bkeepers)
