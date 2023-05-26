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

  router.get("/probot", async (req, res) => {
    let pkg;
    try {
      pkg = (
        await import(path.join(process.cwd(), "package.json"), {
          assert: { type: "json" },
        })
      ).default;
    } catch (e) {
      pkg = {};
    }

    res.render("probot.handlebars", pkg);
  });
  router.get("/", (req, res, next) => res.redirect("/probot"));
}
