import { Deprecation } from "deprecation";

import { Application } from "./application";
import { ApplicationFunction, ApplicationFunctionOptions } from "./types";

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

/**
 * Loads an ApplicationFunction into the current Application
 * @param appFn - Probot application function to load
 */
export function load(
  app: Application,
  appFn: ApplicationFunction | ApplicationFunction[]
) {
  const deprecatedApp = DEPRECATED_APP_KEYS.reduce(
    (api: Record<string, unknown>, key: DeprecatedKey) => {
      Object.defineProperty(api, key, {
        get() {
          if (didDeprecate) return app[key];

          app.log.warn(
            new Deprecation(
              '[probot] "(app) => {}" is deprecated. Use "({ app }) => {}" instead'
            )
          );
          didDeprecate = true;

          return app[key];
        },
      });

      return api;
    },
    {}
  );

  if (Array.isArray(appFn)) {
    appFn.forEach((fn) => load(app, fn));
  } else {
    appFn(
      (Object.assign(deprecatedApp, {
        app,
      }) as unknown) as ApplicationFunctionOptions
    );
  }

  return app;
}
