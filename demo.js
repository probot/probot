module.exports = (robot) => {
  robot.on('push', (event) => {
    robot.log('push from', event.payload.sender.login);
  });

  robot.on('issues.opened', async (event, context) => {
    const comment = context.issue({body: "hello world"});
    return context.github.issues.createComment(comment);
  });
}
