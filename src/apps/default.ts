import type { ApplicationFunctionOptions, Probot } from "../index";
import { loadPackageJson } from "../helpers/load-package-json";

export function defaultApp(
  _app: Probot,
  { getRouter }: ApplicationFunctionOptions,
) {
  if (!getRouter) {
    throw new Error("getRouter() is required for defaultApp");
  }

  const router = getRouter();

  router.get("/probot", (_req, res) => {
    const pkg = loadPackageJson();

    res.render("probot.handlebars", pkg);
  });

  router.get("/", (_req, res) => res.redirect("/probot"));
}
