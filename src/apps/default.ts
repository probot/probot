import path from "path";
import { ApplicationFunctionOptions, Probot } from "../index.js";

export function defaultApp(
  app: Probot,
  { getRouter }: ApplicationFunctionOptions
) {
  if (!getRouter) {
    throw new Error("getRouter() is required for defaultApp");
  }

  const router = getRouter();

  router.get("/probot", (req, res) => {
    let pkg;
    try {
      pkg = require(path.join(process.cwd(), "package.json"));
    } catch (e) {
      pkg = {};
    }

    res.render("probot.handlebars", pkg);
  });
  router.get("/", (req, res, next) => res.redirect("/probot"));
}
