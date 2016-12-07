on("issues.opened").comment(`
  Hello @{{ sender.login }}. Thanks for inviting me to your project.
  Read more about [all the things I can help you with][config]. I can't
  wait to get started!

  [config]: https://github.com/bkeepers/PRobot/blob/master/docs/configuration.md
`);
