---
title: Best practices
---

# Best practices

First and foremost, your app must obey the [The Three Laws of Robotics](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics):

> 0. A robot may not harm humanity, or through inaction allow humanity to come to harm.
> 1. A robot may not injure a human being or, through inaction, allow a human being to come to harm.
> 2. A robot must obey the orders given it by human beings except where such orders would conflict with the First Law.
> 3. A robot must protect its own existence as long as such protection does not conflict with the First or Second Laws.

Now that we agree that nobody will get hurt, here are some tips to make your app more effective.

**Contents:**

<!-- toc -->

- [Empathy](#empathy)
  - [Avoid the uncanny valley](#avoid-the-uncanny-valley)
- [Autonomy](#autonomy)
  - [Never take bulk actions without explicit permission](#never-take-bulk-actions-without-explicit-permission)
  - [Include "dry run" functionality](#include-dry-run-functionality)
- [Configuration](#configuration)
  - [Require minimal configuration](#require-minimal-configuration)
  - [Provide full configuration](#provide-full-configuration)
  - [Store configuration in the repository](#store-configuration-in-the-repository)

<!-- tocstop -->

## Empathy

Understanding and being aware of the what another person is thinking or feeling is critical to healthy relationships. This is true for interactions with humans as well as apps, and it works both ways. Empathy enhances our [ability to receive and process information](http://5a5f89b8e10a225a44ac-ccbed124c38c4f7a3066210c073e7d55.r9.cf1.rackcdn.com/files/pdfs/news/Empathy_on_the_Edge.pdf), and it helps us communicate more effectively.

Think about how people will experience the interactions with your app.

### Avoid the uncanny valley

The [uncanny valley](https://en.wikipedia.org/wiki/Uncanny_valley) is the hypothesis that our emotional response to a robot becomes increasingly positive as it appears to be more human, until it becomes eerie and empathy quickly turns to revulsion. This area between a "barely human" and "fully human" is the uncanny valley.

![uncanny valley](https://upload.wikimedia.org/wikipedia/commons/f/f0/Mori_Uncanny_Valley.svg)

Your app should be empathetic, but it shouldn't pretend to be human. It is an app and everyone that interacts with it knows that.

> - :smile: "Latest build failures: _{listing of build failures}_…"
> - :cry: "Hey there! You asked for the build failures, so I went and dug them up for you: _{listing of build failures}_ … Have a fantastic day!"

## Autonomy

### Never take bulk actions without explicit permission

Being installed on an account is sufficient permission for actions in response to a user action, like replying on a single issue. But a app _must_ have explicit permission before performing bulk actions, like labeling all open issues.

For example, the [stale](https://github.com/probot/stale) app will only scan a target repository for stale issues and pull requests if `.github/stale.yml` exists in that target repository.

### Include "dry run" functionality

A dry run is when a app, instead of actually taking an action, only logs what actions it would have taken if it wasn't a dry run. A app _must_ offer a dry run feature if it does anything destructive and _should_ offer a dry run feature in all cases.

For example, the [stale](https://github.com/probot/stale) app will perform a dry run if there is no `.github/stale.yml` file in the target repository.

## Configuration

### Require minimal configuration

Apps _should_ provide sensible defaults for all settings.

### Provide full configuration

Apps _should_ allow all settings to be customized for each installation.

### Store configuration in the repository

Any configuration _should_ be stored in the target repository. Unless the app is using files from an established convention, the configuration _should_ be stored in the `.github` directory. See the [API docs for `context.config`](https://probot.github.io/api/latest/classes/context.html#config).

`context.config` supports sharing configs between repositories. If configuration for your app is not available in the target repository, it will be loaded from the `.github` directory of the target organization's `.github` repository.

User's can also choose their own shared location. Use the `_extends` option in the configuration file to extend settings from another repository.

For example, given `.github/test.yml`:

```yaml
_extends: github-settings
# Override values from the extended config or define new values
name: myrepo
```

This configuration will be merged with the `.github/test.yml` file from the `github-settings` repository, which might look like this:

```yaml
shared1: will be merged
shared2: will also be merged
```

Just put common configuration keys in a repository within your organization. Then reference this repository from config files with the same name.

You can also reference configurations from other organizations:

```yaml
_extends: other/probot-settings
other: DDD
```

Additionally, you can specify a specific path for the configuration by
appending a colon after the project.

```yaml
_extends: probot-settings:.github/other_test.yaml
other: FFF
```

Inherited configurations are in the **exact same location** within the
repositories.

```yaml
# octocat/repo1:.github/test.yaml
_extends: .github
other: GGG

# octocat/.github:test.yaml
other: HHH
```
