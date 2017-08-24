# Probot

Probot is a bot framework for GitHub. It's like [Hubot](https://hubot.github.com/), but for GitHub instead of chat.

If you've ever thought, "wouldn't it be cool if GitHub could…"; imma stop you right there. Most features can actually be added via [GitHub Apps](https://developer.github.com/apps/), which extend GitHub and can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Apps are first class actors within GitHub.

There are some great services that offer [apps in the GitHub Marketplace](https://github.com/marketplace), and you can build a bunch of really cool things yourself. Probot aims to make that easy.

## Apps

Apps are easy to write, deploy, and share. Here are just a few examples of things that can be built with Probot:

- [stale](https://github.com/probot/stale) - closes abandoned issues after a period of inactivity.
- [owners](https://github.com/probot/owners) - @mentions people in Pull Requests based on contents of the OWNERS file
- [settings](https://github.com/probot/settings) - syncs repository settings defined in `.github/settings.yml` to GitHub, enabling Pull Requests for repository settings.

Check out [all Probot apps](https://github.com/search?q=topic%3Aprobot-app&type=Repositories).

## Contributing

Most of the interesting things are built with plugins, so consider starting by [writing a new app](docs/) or improving one of the [existing ones](https://github.com/search?q=topic%3Aprobot-app&type=Repositories).

Want to chat with Probot users and contributors? [Join us in Slack](https://probot-slackin.herokuapp.com/)!
