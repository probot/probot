/**
 * @param {import('../../lib').Probot} app
 */
module.exports = (app) => {
  // Your code here
  app.log.info("Yay! The app was loaded!");

  // example of probot responding 'Hello World' to a new issue being opened
  app.on("issues.opened", async (context) => {
    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   {owner: 'yourname', repo: 'yourrepo', issue_number: 123, body: 'Hello World!}
    const params = context.issue({ body: "Hello World!" });

    // Post a comment on the issue
    await context.octokit.issues.createComment(params).then(
      () => console.log("issue comment created"),
      (error) => console.log("not ok", error)
    );
  });
};
