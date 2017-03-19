# Probot

[![Greenkeeper badge](https://badges.greenkeeper.io/probot/probot.svg)](https://greenkeeper.io/)

Probot is bot framework for GitHub. It's like [Hubot](https://hubot.github.com/), but for GitHub instead of chat.

If you've ever thought, "wouldn't it be cool if GitHub could…"; imma stop you right there. Most features can actually be added via [GitHub Integrations](https://developer.github.com/early-access/integrations/):

> Integrations are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Integrations are first class actors within GitHub.
>
> –Documentation on [GitHub Integrations](https://developer.github.com/early-access/integrations/)

Some companies provide [hosted integrations](https://github.com/integrations) that you can install, but there's also a bunch of really cool things you can build yourself, and Probot aims to make that easy.

Here are a few examples of things you can build:

- [autoresponder](https://github.com/probot/autoresponder) replies to opened issues with the contents of `.github/ISSUE_REPLY_TEMPLATE.md`
- [stale](https://github.com/probot/stale) closes abandoned issues after a period of inactivity.

Browse all [probot plugins](https://github.com/search?q=topic%3Aprobot-plugin+org%3Aprobot&type=Repositories).

## Contributing

Most of the interesting things are built with [plugins](docs/plugins.md), so consider starting by writing a new plugin or improving one of the [existing ones](https://github.com/search?q=topic%3Aprobot-plugin+org%3Aprobot&type=Repositories).

See [CONTRIBUTING.md](CONTRIBUTING.md) for other ways to contribute.

[![Join the chat at https://gitter.im/bkeepers/PRobot](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bkeepers/PRobot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
