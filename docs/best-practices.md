# Best practices for plugins

## Autonomy

### Never take bulk actions without explicit permission

Being installed on an account is sufficient permission for actions in response to a user action, like replying on a single issue. But a plugin _must_ have explicit permission before performing bulk actions, like labeling all open issues.

For example, the [stale](https://github.com/probot/stale) plugin will only scan a repository for stale issues and pull requests if `.github/stale.yml` exists in the repository.

### Include "dry run" functionality

A dry run is when a plugin, instead of actually taking an action, only logs what actions it would have taken if it wasn't a dry run. A plugin _must_ offer a dry run feature if it does anything destructive and _should_ offer a dry run feature in all cases.

For example, the [stale](https://github.com/probot/stale) plugin will perform a dry run if there is no `.github/stale.yml` file in the repository.

## Configuration

### Require minimal configuration

Plugins _should_ provide sensible defaults for all settings.

### Provide full configuration

Plugins _should_ allow all settings to customized for each installation.

### Store configuration in the repository

Any configuration _should_ be stored in the repository. Unless the plugin is using files from an established convention, the configuration _should_ be stored in the `.github` directory.

For example, the [owners](https://github.com/probot/owners) plugin reads from the `OWNERS` file, which is a convention that existed before the plugin was created, while the [configurer](https://github.com/probot/configurer) plugin reads from `.github/config.yml`.
