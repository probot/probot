---
next: docs/hello-world.md
permalink: /docs/
---

# Introduction

If you've ever thought, "wouldn't it be cool if GitHub could…"; imma stop you right there. Most features can actually be added via [GitHub Apps](https://developer.github.com/apps/), which extend GitHub and can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Apps are first class actors within GitHub.

**Probot is a framework for building [GitHub Apps](http://developer.github.com/apps) in [Node.js](https://nodejs.org/)**. It aims to eliminate all the drudgery–like receiving and validating webhooks, and doing authentication handstands–so you can focus on the features you want to build.

Probot apps are easy to write, deploy, and share. Many of the most popular Probot apps are hosted, so there's nothing for you to deploy and manage. Here are just a few examples of things that have been built with Probot:

- [stale](https://probot.github.io/apps/stale) - closes abandoned issues after a period of inactivity.
- [settings](https://probot.github.io/apps/settings) - syncs repository settings defined in `.github/settings.yml` to GitHub, enabling Pull Requests for repository settings.
- [request-info](https://probot.github.io/apps/request-info) - requests more info from newly opened Pull Requests and Issues that contain either default titles or whose description is left blank.
- [Browse more examples](https://github.com/search?q=topic%3Aprobot-app&type=Repositories)

Ready to get started?
