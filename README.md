# Probot

Probot is bot framework for GitHub. It's like [Hubot](https://hubot.github.com/), but for GitHub instead of chat.

If you've ever thought, "wouldn't it be cool if GitHub could…"; imma stop you right there. Most features can actually be added via [GitHub Integrations](https://developer.github.com/early-access/integrations/):

> Integrations are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Integrations are first class actors within GitHub.
>
> –Documentation on [GitHub Integrations](https://developer.github.com/early-access/integrations/)

There are some great services that offer [hosted integrations](https://github.com/integrations), but you can build a bunch of really cool things yourself. Probot aims to make that easy.

## Plugins

Bots are implemented as plugins, which are easy to write, deploy, and share. Here are just a few examples of things probot can do:

- [stale](https://github.com/probot/stale) - closes abandoned issues after a period of inactivity.
- [owners](https://github.com/probot/owners) - @mentions people in Pull Requests based on contents of the OWNERS file
- [configurer](https://github.com/probot/configurer) - syncs repository settings defined in `.github/config.yml` to GitHub, enabling Pull Requests for repository settings.

Check out [all probot plugins](https://github.com/search?q=topic%3Aprobot-plugin&type=Repositories).

## Contributing

Most of the interesting things are built with plugins, so consider starting by [writing a new plugin](docs/plugins.md) or improving one of the [existing ones](https://github.com/search?q=topic%3Aprobot-plugin&type=Repositories).
