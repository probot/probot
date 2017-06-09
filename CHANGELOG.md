# Changelog

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
