# Probot

[![npm version](https://img.shields.io/npm/v/probot.svg)](https://www.npmjs.com/package/probot) [![](https://img.shields.io/twitter/follow/ProbotTheRobot.svg?style=social&logo=twitter&label=Follow)](https://twitter.com/ProbotTheRobot)

> 🤖 A framework for building GitHub Apps to automate and improve your workflow

If you've ever thought, "wouldn't it be cool if GitHub could…"; I'm going to stop you right there. Most features can actually be added via [GitHub Apps](https://developer.github.com/apps/), which extend GitHub and can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. Apps are first class actors within GitHub.

## How it works

**Probot is a framework for building [GitHub Apps](http://developer.github.com/apps) in [Node.js](https://nodejs.org/)**. GitHub Apps can listen to webhook events sent by a repository or organization. Probot uses its internal event emitter to perform actions based on those events. A simple Probot App might look like this:

```js
module.exports = robot => {
  robot.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    return context.github.issues.createComment(issueComment)
  })
}
```
Check out some of the [featured apps](https://probot.github.io/apps) or [read the docs](https://probot.github.io/docs/) to learn more about writing a new app.

## Contributing

Probot is built by people just like you! Most of the interesting things are built _with_ Probot, so consider starting by [writing a new app](https://probot.github.io/docs/) or improving one of the [existing ones](https://github.com/search?q=topic%3Aprobot-app&type=Repositories), and check out our [contributing docs](CONTRIBUTING.md) for other ways to get started.

Want to chat with Probot users and contributors? [Join us in Slack](https://probot-slackin.herokuapp.com/)!

## Ideas

Have an idea for a cool new GitHub App (built with Probot)? That's great! If you want feedback, help, or just to share it with the world you can do so by [creating an issue in the `probot/ideas` repository](https://github.com/probot/ideas/issues/new)!

## Summer of Code

Probot is super excited to be participating in Rails Girls Summer of Code & Google Summer of Code! We've written [some documentation on how to get started](https://probot.github.io/docs/summer-of-code) if you're part of one of these programs.
