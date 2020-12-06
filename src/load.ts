import { Deprecation } from "deprecation";
import { Router } from "express";

import { Probot } from "./index";
import { Application } from "./application";
import { ApplicationFunction, ApplicationFunctionOptions } from "./types";
import { getRouter } from "./get-router";

type DeprecatedKey =
  | "auth"
  | "load"
  | "log"
  | "on"
  | "receive"
  | "route"
  | "router";

const DEPRECATED_APP_KEYS: DeprecatedKey[] = [
  "auth",
  "load",
  "log",
  "on",
  "receive",
  "route",
  "router",
];
let didDeprecate = false;

function bindMethod(app: Probot | Application, key: keyof Application) {
  return typeof app[key] === "function" ? app[key].bind(app) : app[key];
}

/**
 * Loads an ApplicationFunction into the current Application
 * @param appFn - Probot application function to load
 */
export function load(
  app: Application | Probot,
  router: Router | null,
  appFn: ApplicationFunction | ApplicationFunction[]
) {
  const deprecatedApp = DEPRECATED_APP_KEYS.reduce(
    (api: Record<string, unknown>, key: DeprecatedKey) => {
      Object.defineProperty(api, key, {
        get() {
          if (didDeprecate) return bindMethod(app, key);

          app.log.warn(
            new Deprecation(
              '[probot] "(app) => {}" is deprecated. Use "({ app }) => {}" instead'
            )
          );
          didDeprecate = true;

          return bindMethod(app, key);
        },
      });

      return api;
    },
    {}
  );

  if (Array.isArray(appFn)) {
    appFn.forEach((fn) => load(app, router, fn));
  } else {
    appFn(
      (Object.assign(deprecatedApp, {
        app,
        getRouter: getRouter.bind(null, router || app.router),
      }) as unknown) as ApplicationFunctionOptions
    );
  }

  return app;
}
