/**
 * @param {{app: import("../..".Probot)}}
 */
export default function app(app) {
  app.log.info("loaded app");

  app.on("issue_comment.created", async (context) => {
    context.log.info("Comment created");
  });
}
