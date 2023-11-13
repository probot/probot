import type { ApplicationFunctionOptions, Probot } from "../index";
import { loadPackageJson } from "../helpers/load-package-json";
import { resolve } from "path";

export function defaultApp(
  _app: Probot,
  { getRouter, cwd = process.cwd() }: ApplicationFunctionOptions,
) {
  if (!getRouter) {
    throw new Error("getRouter() is required for defaultApp");
  }

  const router = getRouter();

  router.get("/probot", (_req, res) => {
    const pkg = loadPackageJson(resolve(cwd, "package.json"));

    res.render("probot.handlebars", pkg);
  });

  router.get("/", (_req, res) => res.redirect("/probot"));
}
