import { Router } from "express";

import { Probot } from "./index";
import { ApplicationFunction } from "./types";
import { getRouter } from "./get-router";
import { resolveAppFunction } from "./helpers/resolve-app-function";

/**
 * Loads an ApplicationFunction into the current application
 * @param appFn - Probot application function to load
 */
export async function load(
  app: Probot,
  router: Router,
  appFn: string | ApplicationFunction | ApplicationFunction[]
) {
  if (Array.isArray(appFn)) {
    for (const fn of appFn) {
      await load(app, router, fn);
    }
    return app;
  }

  const fn = typeof appFn === "string" ? resolveAppFunction(appFn) : appFn;

  await fn({
    app,
    getRouter: getRouter.bind(null, router),
  });

  return app;
}
