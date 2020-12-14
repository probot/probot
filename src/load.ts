import { Deprecation } from "deprecation";
import { Router } from "express";

import { Probot } from "./index";
import { Application } from "./application";
import { ApplicationFunction } from "./types";
import { getRouter } from "./get-router";
import { resolveAppFunction } from "./helpers/resolve-app-function";

let didDeprecateApp = false;
let didDeprecateRouter = false;

/**
 * Loads an ApplicationFunction into the current Application
 * @param appFn - Probot application function to load
 */
export async function load(
  app: Application | Probot,
  router: Router | null,
  appFn: string | ApplicationFunction | ApplicationFunction[]
) {
  const boundGetRouter = getRouter.bind(null, router || app.router);

  if (!("app" in app)) {
    Object.defineProperty(app, "app", {
      get() {
        if (didDeprecateApp) return app;

        app.log.warn(
          new Deprecation(
            '[probot] "({ app }) => {}" is deprecated (sorry!). We reverted back to the previous API "(app) => {}", see reasoning at https://github.com/probot/probot/issues/1286#issuecomment-744094299'
          )
        );

        didDeprecateApp = true;

        return app;
      },
    });

    Object.defineProperty(app, "getRouter", {
      get() {
        if (didDeprecateRouter) return boundGetRouter;

        app.log.warn(
          new Deprecation(
            '[probot] "({ app, getRouter }) => {}" is deprecated. Use "(app, { getRouter }) => {}" instead'
          )
        );

        didDeprecateRouter = true;

        return boundGetRouter;
      },
    });
  }

  if (Array.isArray(appFn)) {
    for (const fn of appFn) {
      await load(app, router, fn);
    }
    return app;
  }

  const fn = typeof appFn === "string" ? resolveAppFunction(appFn) : appFn;

  await fn(app, { getRouter: boundGetRouter });

  return app;
}
