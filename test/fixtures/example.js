/**
 * @param {{app: import("../..".Probot)}}
 */
export default (app) => {
  app.log.info("loaded app");

  app.on("issue_comment.created", async (context) => {
    context.log.info("Comment created");
  });
};
