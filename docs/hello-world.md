---
next: docs/development.md
---

# Hello World

A Probot plugin is just a [Node.js module](https://nodejs.org/api/modules.html) that exports a function:

```js
module.exports = robot => {
  // your code here
};
```

The `robot` parameter is an instance of [`Robot`](https://probot.github.io/probot/latest/Robot.html) and gives you access to all of the bot goodness.
