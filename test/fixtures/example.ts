import { Application } from "../../src/application";

export = (app: Application) => {
  app.log.info("loaded app");

  app.on("issue_comment.created", async (context) => {
    context.log.info("Comment created");
  });
};
