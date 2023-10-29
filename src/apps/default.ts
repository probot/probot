import path from "path";
import type { ApplicationFunctionOptions, Probot } from "../index";

export function defaultApp(
  _app: Probot,
  { getRouter }: ApplicationFunctionOptions
) {
  if (!getRouter) {
    throw new Error("getRouter() is required for defaultApp");
  }

  const router = getRouter();

  router.get("/probot", (_req, res) => {
    let pkg;
    try {
      pkg = require(path.join(process.cwd(), "package.json"));
    } catch (e) {
      pkg = {};
    }

    res.render("probot.handlebars", pkg);
  });

  router.get("/", (_req, res) => res.redirect("/probot"));
}
