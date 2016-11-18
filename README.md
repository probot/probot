# PRobot

[![Join the chat at https://gitter.im/bkeepers/PRobot](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bkeepers/PRobot?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

_**Heads up!** "PRobot" is a codename that is almost guaranteed to change._

PRobot is a trainable robot that responds to activity on GitHub. It's like [Hubot](https://hubot.github.com/), but for GitHub events instead of chat messages.

## Installing

_**Heads up!** The [demo integration](https://github.com/integration/probot-demo) is for demo purposes only. It is very likely to go away at some point, so please don't use it for production purposes._

0. Go to the **[demo integration](https://github.com/integration/probot-demo)**, click **Install**, and then select an organization.
0. Add @probot as a collaborator with write access on your repository.
0. Create a `.probot.js` file in your repository with the following contents. See [Configuration](docs/configuration.md) for more information on what behaviors can be built.

        on("issues.opened").comment(`
          Hello @{{ sender.login }}. Thanks for inviting me to your project.
          Read more about [all the things I can help you with][config]. I can't
          wait to get started!

          [config]: https://github.com/bkeepers/PRobot/blob/master/docs/configuration.md
        `);

0. Open a new issue. @probot should post a comment (you may need to refresh to see it).
